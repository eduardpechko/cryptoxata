import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Transaction, Project, SyncConfig, Account } from '../types';
import { STORAGE_KEY, INITIAL_PROJECTS } from '../constants';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string;

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11);
};

const defaultState: AppState = {
  transactions: [],
  projects: INITIAL_PROJECTS,
  accounts: [],
  syncConfig: {
    enabled: true,
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    tableName: 'sync_store',
    rowId: 'cryptoxata_v1'
  }
};

let supabase: SupabaseClient | null = null;
let lastError: string | null = null;
let currentConfigHash: string = '';

export const getLastError = () => lastError;

const initSupabase = (config: SyncConfig) => {
  if (!config.enabled || !config.supabaseUrl || !config.supabaseKey) {
    supabase = null;
    currentConfigHash = '';
    return null;
  }

  // Prevent re-initializing if config hasn't changed to avoid memory leaks
  const configHash = `${config.supabaseUrl}-${config.supabaseKey}`;
  if (!supabase || currentConfigHash !== configHash) {
    try {
      supabase = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      currentConfigHash = configHash;
    } catch (e) {
      console.error("Supabase init failed", e);
      lastError = "Failed to initialize Supabase client";
      supabase = null;
    }
  }
  return supabase;
};

// Helper: Merges two arrays of transactions based on ID, preferring the most recently updated one
export const mergeTransactions = (local: Transaction[], remote: Transaction[]): Transaction[] => {
  const map = new Map<string, Transaction>();
  
  // Combine both arrays
  const all = [...local, ...remote];
  
  all.forEach(t => {
      const existing = map.get(t.id);
      if (!existing) {
          map.set(t.id, t);
      } else {
          // Conflict resolution: prefer the one with the newer updatedAt timestamp
          // If timestamps are missing (legacy data), prefer the one that is already in the map (arbitrary stability) 
          // or we could assume 't' is newer if it comes from a specific source, but here we treat them equally.
          // For legacy data without updatedAt, we'll default to 0.
          const tTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
          const eTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          
          if (tTime > eTime) {
              map.set(t.id, t);
          }
      }
  });
  
  return Array.from(map.values());
};

export const mergeProjects = (local: Project[], remote: Project[]): Project[] => {
    const map = new Map<string, Project>();
    INITIAL_PROJECTS.forEach(p => map.set(p.id, p)); // Always ensure hardcoded ones exist
    remote.forEach(p => map.set(p.id, p));
    local.forEach(p => map.set(p.id, p));
    return Array.from(map.values());
};

export const mergeAccounts = (local: Account[], remote: Account[]): Account[] => {
    const map = new Map<string, Account>();
    
    const all = [...local, ...remote];
    all.forEach(a => {
        const existing = map.get(a.id);
        if (!existing) {
            map.set(a.id, a);
        } else {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const eTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
            if (aTime > eTime) {
                map.set(a.id, a);
            }
        }
    });
    return Array.from(map.values());
};

export const loadData = async (): Promise<{ data: AppState, error?: string }> => {
  lastError = null;
  let localState = defaultState;
  
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      if (!parsed.syncConfig || !parsed.syncConfig.supabaseUrl) {
          parsed.syncConfig = defaultState.syncConfig;
      }
      // Ensure accounts array exists for legacy data
      if (!parsed.accounts) {
          parsed.accounts = [];
      }
      localState = parsed;
    }
  } catch (e) {
    console.error("Local load failed", e);
  }

  const config = localState.syncConfig || defaultState.syncConfig!;
  const client = initSupabase(config);
  
  if (client && config.enabled) {
    try {
      const { data, error } = await client
        .from(config.tableName)
        .select('data')
        .eq('id', config.rowId)
        .maybeSingle();

      if (error) {
        lastError = error.message;
        return { data: localState, error: lastError };
      }
      
      if (data && data.data) {
        const remoteData = data.data as AppState;
        
        const mergedTransactions = mergeTransactions(localState.transactions, remoteData.transactions || []);
        const mergedProjects = mergeProjects(localState.projects, remoteData.projects || []);
        const mergedAccounts = mergeAccounts(localState.accounts || [], remoteData.accounts || []);

        const mergedState: AppState = {
            ...remoteData,
            transactions: mergedTransactions,
            projects: mergedProjects,
            accounts: mergedAccounts,
            syncConfig: localState.syncConfig
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
        return { data: mergedState };
      } else {
        await saveData(localState);
      }
    } catch (e: any) {
      lastError = e.message;
      return { data: localState, error: lastError };
    }
  }

  return { data: localState };
};

export const saveData = async (state: AppState): Promise<{ success: boolean; error?: string }> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Local save failed", e);
  }

  const config = state.syncConfig || defaultState.syncConfig!;
  const client = initSupabase(config);
  
  if (client && config.enabled) {
    try {
      const { data: remoteRow, error: fetchError } = await client
        .from(config.tableName)
        .select('data')
        .eq('id', config.rowId)
        .maybeSingle();
        
      let stateToSave = state;

      if (!fetchError && remoteRow && remoteRow.data) {
          const remoteData = remoteRow.data as AppState;
          stateToSave = {
              ...state,
              transactions: mergeTransactions(state.transactions, remoteData.transactions || []),
              projects: mergeProjects(state.projects, remoteData.projects || []),
              accounts: mergeAccounts(state.accounts || [], remoteData.accounts || [])
          };
      }

      const { error } = await client
        .from(config.tableName)
        .upsert({ 
          id: config.rowId, 
          data: stateToSave, 
          updated_at: new Date().toISOString() 
        });
        
      if (error) {
        lastError = error.message;
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      lastError = e.message;
      return { success: false, error: e.message };
    }
  }
  return { success: true };
};

export const subscribeToData = (config: SyncConfig, onDataReceived: (data: AppState) => void) => {
    const client = initSupabase(config);
    if (!config.enabled || !client) return () => {};

    const channel = client
        .channel(`public:${config.tableName}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: config.tableName, filter: `id=eq.${config.rowId}` },
            (payload) => {
                if (payload.new && payload.new.data) {
                    onDataReceived(payload.new.data as AppState);
                }
            }
        )
        .subscribe();

    return () => {
        client.removeChannel(channel);
    };
};

export const createTransaction = (data: Omit<Transaction, 'id' | 'updatedAt' | 'deleted'>): Transaction => {
  const now = new Date().toISOString();
  return {
    ...data,
    id: generateId(),
    updatedAt: now,
  };
};

export const createAccount = (data: Omit<Account, 'id' | 'deleted' | 'updatedAt'>): Account => {
    return {
        ...data,
        id: `acc-${generateId()}`,
        updatedAt: new Date().toISOString()
    };
};

export const exportDataToJson = (state: AppState) => {
  // Filter out deleted transactions for export
  const cleanState = {
      ...state,
      transactions: state.transactions.filter(t => !t.deleted)
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanState));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "cryptoxata_backup.json");
  link.click();
};

export const exportDataToCsv = (state: AppState) => {
  const headers = ['Date', 'User', 'Account', 'Project', 'Spent ($)', 'Volume ($)', 'Points', 'Note', 'Start Date', 'End Date'];
  const rows = state.transactions
    .filter(t => !t.deleted)
    .map(t => {
      const projectName = state.projects.find(p => p.id === t.projectId)?.name || 'Unknown';
      const accountName = state.accounts?.find(a => a.id === t.accountId)?.name || '';
      // Escape CSV sensitive characters
      const safeNote = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';
      return [
          new Date(t.date).toLocaleDateString(),
          t.userId,
          `"${accountName}"`,
          `"${projectName}"`,
          t.spent,
          t.volume,
          t.points,
          safeNote,
          t.startDate,
          t.endDate
      ].join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const link = document.createElement('a');
  link.setAttribute("href", csvContent);
  link.setAttribute("download", "cryptoxata_export.csv");
  link.click();
};