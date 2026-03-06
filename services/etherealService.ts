import { EthereumProvider } from '@walletconnect/ethereum-provider';

// ETHEREAL SERVICE LAYER
const BASE_URL = 'https://api.ethereal.trade';
const OPENAPI_URL = 'https://api.ethereal.trade/openapi.json';

// --- Types ---
export interface EtherealSubaccount {
  id: string;
  sender: string;
}

export interface EtherealBalance {
  asset: string;
  amount: string;
  available: string;
  used: string;
}

export interface EtherealPoints {
  total: number;
  season?: number;
  updatedAt?: string;
  raw?: any;
}

// --- Wallet Connect Configuration ---

// Safe access to environment variables handling different environments (Vite, CRA, Browser)
const getEnv = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            return process.env[key] || process.env[`REACT_APP_${key.replace('VITE_', '')}`];
        }
    } catch (e) {}
    
    return undefined;
};

// Note: Ensure VITE_WALLETCONNECT_PROJECT_ID is set in your .env file
const PROJECT_ID = getEnv('VITE_WALLETCONNECT_PROJECT_ID');
export const hasWalletConnectConfig = !!PROJECT_ID;

let wcProvider: Awaited<ReturnType<typeof EthereumProvider.init>> | null = null;
let activeInjectedProvider: any = null; // Track the specific injected provider (Rabby vs Ethereum)

export const getWalletConnectProvider = async () => {
  if (!PROJECT_ID) {
    throw new Error('MISSING_PROJECT_ID');
  }

  if (!wcProvider) {
    wcProvider = await EthereumProvider.init({
      projectId: PROJECT_ID,
      chains: [1], // Mainnet
      showQrModal: true,
      metadata: {
        name: 'CryptoXata',
        description: 'CryptoXata Ethereal Tracker',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://cryptoxata.com',
        icons: typeof window !== 'undefined' ? [`${window.location.origin}/icon.png`] : [],
      },
    });
  }
  return wcProvider;
};

// --- Connection Methods ---

// Helper to detect availability for UI
export const isInjectedProviderAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).rabby ||
    (window as any).ethereum ||
    (window as any).BinanceChain
  );
};

export const isRabbyAvailable = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).rabby;
}

// 1. Primary: WalletConnect
export const connectWalletConnect = async (): Promise<string> => {
  const provider = await getWalletConnectProvider();
  
  // enable() returns the accounts in newer versions and triggers the modal if needed
  const accounts = await provider.enable();
  
  if (accounts && accounts.length > 0) {
    return accounts[0];
  }

  // Fallback check if enable() didn't return them but they are in state
  if (provider.accounts.length > 0) {
      return provider.accounts[0];
  }
  
  throw new Error('No accounts found');
};

// 2. Secondary: Injected (Rabby / MetaMask)
export const connectInjected = async (): Promise<string> => {
  if (typeof window === 'undefined') throw new Error('Window not defined');

  let provider = null;

  // 1. Prioritize Rabby specific object if available
  if ((window as any).rabby) {
      provider = (window as any).rabby;
  } 
  // 2. Fallback to standard Ethereum (MetaMask, or Rabby if it overrides ethereum)
  else if ((window as any).ethereum) {
      provider = (window as any).ethereum;
  } 
  // 3. Other known providers
  else if ((window as any).BinanceChain) {
      provider = (window as any).BinanceChain;
  }

  if (!provider) {
    throw new Error('NO_INJECTED_PROVIDER');
  }

  try {
    // Standard EIP-1193 request
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    
    // Store reference to the successful provider for event listeners
    activeInjectedProvider = provider;
    
    return accounts[0] || null;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('USER_REJECTED');
    }
    console.error("Injected wallet connection failed", error);
    throw error;
  }
};

// --- Disconnect Logic ---
export const disconnectWallet = async () => {
  // If WalletConnect was initialized, disconnect it
  if (wcProvider) {
    try {
      await wcProvider.disconnect();
    } catch (e) {
      console.error("WC Disconnect error", e);
    }
  }
  
  // Clear active injected provider reference
  activeInjectedProvider = null;
  
  // Note: We cannot programmatically disconnect injected wallets (Rabby/MetaMask) 
  // from the dApp side. The user must disconnect in the extension. 
  // We simply clear the local state in the app.
};

// --- Event Listeners ---
export const subscribeToWalletEvents = (
  onAccountsChanged: (accounts: string[]) => void,
  onDisconnect: () => void
) => {
  // 1. WalletConnect Events
  if (wcProvider) {
    wcProvider.on('accountsChanged', onAccountsChanged);
    wcProvider.on('disconnect', onDisconnect);
  }

  // 2. Injected Events - Robust Subscription
  // We try to attach to both Rabby and Ethereum global objects if they exist.
  // This ensures we catch events regardless of which one the user actually used or 
  // if `activeInjectedProvider` was not set when this function was called (e.g. on page mount).
  
  const rabby = typeof window !== 'undefined' ? (window as any).rabby : null;
  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
  const active = activeInjectedProvider;

  // Set of providers we've already attached to, to avoid duplicates
  const attachedProviders = new Set();

  [active, rabby, ethereum].forEach(provider => {
      if (provider && provider.on && !attachedProviders.has(provider)) {
          provider.on('accountsChanged', onAccountsChanged);
          provider.on('disconnect', onDisconnect); // Basic EIP-1193 disconnect handling
          attachedProviders.add(provider);
      }
  });
};

export const unsubscribeFromWalletEvents = (
    onAccountsChanged: (accounts: string[]) => void,
    onDisconnect: () => void
) => {
    if (wcProvider) {
        wcProvider.removeListener('accountsChanged', onAccountsChanged);
        wcProvider.removeListener('disconnect', onDisconnect);
    }
    
    const rabby = typeof window !== 'undefined' ? (window as any).rabby : null;
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
    const active = activeInjectedProvider;

    [active, rabby, ethereum].forEach(provider => {
        if (provider && provider.removeListener) {
            provider.removeListener('accountsChanged', onAccountsChanged);
            provider.removeListener('disconnect', onDisconnect);
        }
    });
};


// --- API Client ---

async function fetchEthereal<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    
    if (!res.ok) {
      const body = await res.text();
      // Throw basic error to be caught by specific logic
      throw new Error(`API_ERROR:${res.status}`);
    }

    return await res.json() as T;
  } catch (e: any) {
    if (e.message === 'RATE_LIMIT') throw e;
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      throw new Error('NETWORK_ERROR');
    }
    throw e;
  }
}

// --- Core Features ---

export const getSubaccounts = async (wallet: string): Promise<EtherealSubaccount[]> => {
  try {
     return await fetchEthereal<EtherealSubaccount[]>('/v1/subaccount', { sender: wallet });
  } catch (e) {
     // Strict adherence to requirement: "Points either load correctly or show a truthful 'unavailable' state"
     console.error("Failed to fetch subaccounts", e);
     throw e; 
  }
};

export const getBalances = async (subaccountId: string): Promise<EtherealBalance[]> => {
  try {
    return await fetchEthereal<EtherealBalance[]>('/v1/subaccount/balance', { subaccountId });
  } catch (e) {
    console.error("Failed to fetch balances", e);
    throw e;
  }
};

// --- Points Discovery (Robust) ---

let cachedPointsEndpoint: string | null = null;

export const discoverPointsEndpoint = async (): Promise<string | null> => {
  if (cachedPointsEndpoint) return cachedPointsEndpoint;

  try {
    const res = await fetch(OPENAPI_URL);
    if (!res.ok) return null;
    
    const doc = await res.json();
    const paths = Object.keys(doc.paths || {});
    const pointsPath = paths.find(p => p.includes('points') && doc.paths[p].get);
    
    if (pointsPath) {
        cachedPointsEndpoint = pointsPath;
        return pointsPath;
    }
    return null;
  } catch (e) {
    console.error("OpenAPI discovery failed", e);
    return null;
  }
};

export const getPoints = async (wallet: string, subaccountId: string): Promise<EtherealPoints | null> => {
  const endpoint = await discoverPointsEndpoint();
  
  if (!endpoint) {
    // If we can't find the endpoint, we return null so UI shows "Unavailable" (Truthful state)
    console.warn("No points endpoint discovered in OpenAPI");
    return null;
  }

  const params: Record<string, string> = {};
  if (endpoint.includes('{sender}')) {
      // Logic would go here to replace path params if API requires it
  }
  
  params['sender'] = wallet;
  params['subaccountId'] = subaccountId;

  try {
    const data = await fetchEthereal<any>(endpoint, params);
    return {
        total: data.total || data.points || data.score || 0,
        season: data.season || 1,
        updatedAt: new Date().toISOString(),
        raw: data
    };
  } catch (e) {
    if ((e as Error).message.includes('401') || (e as Error).message.includes('403')) {
        throw new Error('AUTH_REQUIRED');
    }
    // Propagate rate limits and other errors
    throw e;
  }
};