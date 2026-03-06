
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, RefreshCw, AlertCircle, ShieldCheck,
  ExternalLink, TrendingUp, Layers, Lock, Gem, LogOut, Monitor, ArrowRight
} from 'lucide-react';
import {
  connectWalletConnect, connectInjected, disconnectWallet,
  subscribeToWalletEvents, unsubscribeFromWalletEvents,
  getSubaccounts, getBalances, getPoints, hasWalletConnectConfig, isInjectedProviderAvailable, isRabbyAvailable,
  EtherealSubaccount, EtherealBalance, EtherealPoints
} from '../../services/etherealService';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

// Observability Helper
const trackEvent = (event: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] ${event}`, data);
    }
};

const inputClass = "w-full bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm px-3.5 py-2.5 text-sm font-sans text-[#0d0d0b] dark:text-[#f0efec] focus:border-[#5dde4a] focus:ring-2 focus:ring-[#5dde4a]/20 focus:outline-none transition-colors placeholder-[#71716b] dark:placeholder-[#8a8a82]";

export const EtherealDashboard: React.FC = () => {
  // State
  const [wallet, setWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UX State
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [hasRabby, setHasRabby] = useState(false);

  const [subaccounts, setSubaccounts] = useState<EtherealSubaccount[]>([]);
  const [selectedSubaccount, setSelectedSubaccount] = useState<string>('');

  const [balances, setBalances] = useState<EtherealBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const [points, setPoints] = useState<EtherealPoints | null>(null);
  const [pointsStatus, setPointsStatus] = useState<'idle' | 'loading' | 'success' | 'auth_required' | 'error'>('idle');

  // Detect Environment
  useEffect(() => {
    const checkEnv = () => {
       const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
       const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
       const pointerCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
       setIsMobile(mobileRegex.test(userAgent) || pointerCoarse);
       setHasRabby(isRabbyAvailable());
    };
    checkEnv();
    const onEthereumInitialized = () => setHasRabby(isRabbyAvailable());
    window.addEventListener('ethereum#initialized', onEthereumInitialized);
    const fallbackTimer = setTimeout(() => setHasRabby(isRabbyAvailable()), 2000);
    return () => {
      window.removeEventListener('ethereum#initialized', onEthereumInitialized);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Formatters
  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatCurrency = (val: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));

  // --- Connection Handlers ---

  const handleInjectedLogin = async () => {
      if (!isInjectedProviderAvailable()) {
          trackEvent('ethereal_connect_error', { method: 'injected', error: 'NO_INJECTED_PROVIDER_PRECHECK' });
          setError('Гаманець не знайдено. Введіть адресу вручну для перегляду.');
          setIsMoreOptionsOpen(true);
          return;
      }

      trackEvent('ethereal_connect_clicked', { method: 'injected' });
      setIsConnecting(true);
      setError(null);
      try {
          const addr = await connectInjected();
          setWallet(addr);
          setIsMoreOptionsOpen(false);
          trackEvent('ethereal_connect_success', { method: 'injected' });
      } catch (e: any) {
          trackEvent('ethereal_connect_error', { method: 'injected', error: e.message });
          if (e.message === 'NO_INJECTED_PROVIDER') {
              setError('Гаманець не знайдено. Введіть адресу вручну для перегляду.');
              setIsMoreOptionsOpen(true);
          } else if (e.message === 'USER_REJECTED') {
              setError('Ви відхилили запит на підключення.');
          } else {
              setError('Помилка підключення до браузерного гаманця.');
          }
          console.error(e);
      } finally {
          setIsConnecting(false);
      }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualAddress || !manualAddress.startsWith('0x') || manualAddress.length < 42) {
          setError('Введіть коректну Ethereum адресу (0x...)');
          return;
      }
      setWallet(manualAddress);
      trackEvent('ethereal_connect_success', { method: 'manual_readonly' });
      setIsMoreOptionsOpen(false);
      setManualAddress('');
      setError(null);
  };

  const handleWCLogin = async () => {
      if (!hasWalletConnectConfig) {
          console.warn("WalletConnect not configured. Using Injected Wallet fallback.");
          if (isInjectedProviderAvailable()) {
              await handleInjectedLogin();
          } else {
              setError('Гаманець не знайдено. Введіть адресу вручну.');
              setIsMoreOptionsOpen(true);
          }
          return;
      }

      trackEvent('ethereal_connect_clicked', { method: 'walletconnect' });
      setIsConnecting(true);
      setError(null);
      try {
          const addr = await connectWalletConnect();
          setWallet(addr);
          trackEvent('ethereal_connect_success', { method: 'walletconnect' });
      } catch (e: any) {
          if (e.message === 'MISSING_PROJECT_ID') {
              try {
                  const addr = await connectInjected();
                  setWallet(addr);
                  trackEvent('ethereal_connect_success', { method: 'injected_fallback' });
              } catch (injectedError: any) {
                  if (injectedError.message === 'NO_INJECTED_PROVIDER') {
                       setError('Гаманець не знайдено. Введіть адресу вручну.');
                       setIsMoreOptionsOpen(true);
                  } else {
                       setError('Не вдалось підключитися. Перевірте налаштування.');
                  }
              }
          } else {
              trackEvent('ethereal_connect_error', { method: 'walletconnect', error: e.message });
              setError('Не вдалось підключитися. Спробуйте ще раз.');
          }
          console.error(e);
      } finally {
          setIsConnecting(false);
      }
  };

  const handleDisconnect = async () => {
      await disconnectWallet();
      setWallet(null);
      setSubaccounts([]);
      setBalances([]);
      setPoints(null);
      setPointsStatus('idle');
      setSelectedSubaccount('');
      trackEvent('ethereal_disconnect');
  };

  // Wallet Event Listeners
  useEffect(() => {
      const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length > 0) {
              setWallet(accounts[0]);
              trackEvent('ethereal_accounts_changed');
          } else {
              handleDisconnect();
          }
      };
      const handleDisconnectEvent = () => { handleDisconnect(); };

      subscribeToWalletEvents(handleAccountsChanged, handleDisconnectEvent);
      return () => {
          unsubscribeFromWalletEvents(handleAccountsChanged, handleDisconnectEvent);
      };
  }, []);

  // --- Data Loading ---

  const loadAccountData = useCallback(async () => {
    if (!wallet) return;
    try {
      const subs = await getSubaccounts(wallet);
      setSubaccounts(subs);
      if (subs.length > 0 && !selectedSubaccount) {
        setSelectedSubaccount(subs[0].id);
      }
    } catch (e: any) {
        if (e.message === 'RATE_LIMIT') {
            setError('Перевищено ліміт запитів. Спробуйте через 30 секунд.');
        } else {
             console.warn(`Subaccounts load failed: ${e.message}`);
        }
    }
  }, [wallet, selectedSubaccount]);

  const refreshData = useCallback(async () => {
    if (!selectedSubaccount || !wallet) return;
    setIsLoadingBalances(true);
    setPointsStatus('loading');
    trackEvent('ethereal_data_refresh');

    const balancePromise = getBalances(selectedSubaccount)
      .then(res => {
          setBalances(res);
          trackEvent('ethereal_balance_loaded', { count: res.length });
      })
      .catch(e => {
          console.error("Balance fetch error", e);
          setBalances([]);
          if (e.message === 'RATE_LIMIT') {
             setError('Перевищено ліміт запитів. Спробуйте через 30 секунд.');
          }
      });

    const pointsPromise = getPoints(wallet, selectedSubaccount)
      .then(res => {
          setPoints(res);
          setPointsStatus('success');
          trackEvent('ethereal_points_loaded');
      })
      .catch(e => {
          if (e.message === 'AUTH_REQUIRED') {
              setPointsStatus('auth_required');
          } else {
              setPointsStatus('error');
              trackEvent('ethereal_points_unavailable', { reason: e.message });
          }
      });

    await Promise.all([balancePromise, pointsPromise]);
    setIsLoadingBalances(false);
  }, [wallet, selectedSubaccount]);

  useEffect(() => {
    if (wallet) loadAccountData();
  }, [wallet, loadAccountData]);

  useEffect(() => {
    if (selectedSubaccount) {
        refreshData();
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }
  }, [selectedSubaccount, refreshData]);

  // --- DISCONNECTED STATE VIEW ---
  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-slide-up">
        {/* Logo & Status */}
        <div className="w-20 h-20 bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm flex items-center justify-center">
           <Gem size={36} className="text-[#5dde4a]" />
        </div>

        <div className="text-center max-w-md px-4">
          <div className="flex items-center justify-center gap-3 mb-2">
             <h1 className="font-black text-[2.5rem] tracking-tight leading-none text-[#0d0d0b] dark:text-[#f0efec]">Ethereal</h1>
             <span className="px-2.5 py-1 bg-[#e8e8e4] dark:bg-[#2a2a28] text-[#71716b] dark:text-[#8a8a82] border border-[#d6d5d0] dark:border-[#3a3a38] font-mono text-[11px] uppercase tracking-widest rounded-sm">
               В розробці
             </span>
          </div>
          <p className="font-sans text-sm text-[#71716b] dark:text-[#8a8a82]">
            Підключіть гаманець для відстеження балансу біржі та поінтів у реальному часі.
          </p>
        </div>

        {/* Error Message */}
        {error && (
            <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] text-[#c03030] dark:text-[#f08080] px-4 py-3 rounded-sm text-sm font-bold flex flex-col sm:flex-row items-center gap-2 max-w-sm text-center sm:text-left border border-[#d6d5d0] dark:border-[#2a2a28] animate-slide-in-bottom">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
            </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <button
                onClick={handleWCLogin}
                disabled={isConnecting}
                className="w-full bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] px-6 py-3.5 rounded-sm font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Wallet size={16} />}
                {isConnecting ? 'Підключення...' : (hasWalletConnectConfig ? 'Підключити Гаманець' : 'Браузерний Гаманець')}
            </button>

            {!isConnecting && isMobile && hasWalletConnectConfig && (
                 <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] text-center">
                    На мобільному найкраще працює WalletConnect
                 </p>
            )}

            {!isConnecting && (
                <button
                    onClick={() => setIsMoreOptionsOpen(true)}
                    className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] transition-colors"
                >
                    [ Більше опцій ]
                </button>
            )}
        </div>

        {/* More Options Modal */}
        <Modal
            isOpen={isMoreOptionsOpen}
            onClose={() => setIsMoreOptionsOpen(false)}
            title="Спосіб підключення"
        >
            <div className="space-y-6">
                {/* 1. Manual Entry */}
                 <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-3">Перегляд (Read-Only)</p>
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="0x..."
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            className={`${inputClass} flex-1 font-mono text-xs`}
                        />
                        <button
                            type="submit"
                            disabled={!manualAddress}
                            className="bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] p-2.5 rounded-sm hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </form>
                </div>

                <div className="h-px bg-[#d6d5d0] dark:bg-[#2a2a28]" />

                {/* 2. Wallets */}
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-3">Гаманці</p>
                    <button
                        onClick={handleInjectedLogin}
                        className="w-full flex items-center justify-between p-4 bg-[#f5f5f0] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm hover:border-[#a0a09a] dark:hover:border-[#3a3a38] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-[#e8e8e4] dark:bg-[#2a2a28] text-[#0d0d0b] dark:text-[#f0efec]">
                                {hasRabby ? <img src="https://rabby.io/assets/logo.svg" className="w-5 h-5" alt="Rabby" /> : <Monitor size={18} />}
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{hasRabby ? 'Rabby Wallet' : 'Браузерний гаманець'}</div>
                                <div className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82]">{hasRabby ? 'Виявлено' : 'MetaMask, Rabby, etc.'}</div>
                            </div>
                        </div>
                    </button>

                    {isMobile && (
                        <div className="flex gap-2 items-start p-3 bg-[#e8e8e4] dark:bg-[#1a1a18] text-[#71716b] dark:text-[#8a8a82] rounded-sm border border-[#d6d5d0] dark:border-[#2a2a28] font-mono text-[11px] mt-2">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>У мобільному браузері гаманець може не бути доступним. Рекомендуємо WalletConnect.</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-center pt-1">
                     <button
                       onClick={() => setIsMoreOptionsOpen(false)}
                       className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] transition-colors"
                     >
                       [ Скасувати ]
                     </button>
                </div>
            </div>
        </Modal>

      </div>
    );
  }

  // --- CONNECTED STATE VIEW ---
  const totalValue = balances.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);
  const totalAvailable = balances.reduce((sum, b) => sum + parseFloat(b.available || '0'), 0);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-black text-[2.5rem] tracking-tight leading-none text-[#0d0d0b] dark:text-[#f0efec]">Портфоліо</h1>
            <span className="px-2.5 py-1 bg-[#e8e8e4] dark:bg-[#2a2a28] text-[#71716b] dark:text-[#8a8a82] border border-[#d6d5d0] dark:border-[#3a3a38] font-mono text-[11px] uppercase tracking-widest rounded-sm translate-y-[-4px]">
              В розробці
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
            Огляд активів <span className="text-[#0d0d0b] dark:text-[#f0efec] font-bold">Ethereal</span> та винагород
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
             {/* Wallet address chip */}
             <div className="flex items-center gap-2 bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] px-3 py-1.5 rounded-sm">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#5dde4a] animate-pulse"></div>
                 <span className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82]">{formatAddr(wallet)}</span>
             </div>

             {subaccounts.length > 0 && (
                 <select
                    value={selectedSubaccount}
                    onChange={(e) => setSelectedSubaccount(e.target.value)}
                    className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] text-sm font-mono py-1.5 px-3 rounded-sm text-[#0d0d0b] dark:text-[#f0efec] focus:outline-none focus:border-[#5dde4a]"
                 >
                     {subaccounts.map(s => (
                         <option key={s.id} value={s.id}>Sub: {s.id.slice(0,8)}...</option>
                     ))}
                 </select>
             )}

            <button
                onClick={refreshData}
                disabled={isLoadingBalances}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:border-[#a0a09a] dark:hover:border-[#3a3a38] transition-colors disabled:opacity-40"
                title="Оновити"
                aria-label="Оновити дані"
            >
                <RefreshCw size={16} className={isLoadingBalances ? 'animate-spin' : ''} />
            </button>

            <button
                onClick={handleDisconnect}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm text-[#71716b] hover:text-[#c03030] hover:border-[#e8b8b8] dark:hover:border-[#4a1a1a] transition-colors"
                title="Відключити гаманець"
                aria-label="Відключити гаманець"
            >
                <LogOut size={16} />
            </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
            <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] text-[#c03030] dark:text-[#f08080] px-4 py-3 rounded-sm text-sm font-bold flex items-center gap-2 border border-[#d6d5d0] dark:border-[#2a2a28] animate-slide-in-bottom">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto font-mono text-[11px] uppercase tracking-widest hover:text-[#a02020] transition-colors">[ OK ]</button>
            </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Balances (2/3) */}
          <div className="lg:col-span-2 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                  {/* Total Balance — dark hero card */}
                  <div className="bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm corner-mark relative p-6 flex flex-col justify-between h-36">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#8a8a82] dark:text-[#71716b]">
                          <Layers size={12} /> Загальний Баланс
                      </div>
                      <div>
                          <div className="font-mono font-bold text-2xl sm:text-3xl tracking-tighter text-[#f0efec] dark:text-[#0d0d0b]">
                             {isLoadingBalances ? <div className="h-8 w-28 bg-[#2a2a28] dark:bg-[#d6d5d0] rounded-sm animate-pulse" /> : formatCurrency(String(totalValue))}
                          </div>
                          <p className="font-mono text-[11px] text-[#8a8a82] dark:text-[#71716b] mt-1">Всі активи на суб-акаунті</p>
                      </div>
                  </div>

                  {/* Available Margin */}
                  <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative p-6 flex flex-col justify-between h-36">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
                          <ShieldCheck size={12} /> Доступна Маржа
                      </div>
                      <div>
                          <div className="font-mono font-bold text-2xl sm:text-3xl tracking-tighter text-[#0d0d0b] dark:text-[#f0efec]">
                             {isLoadingBalances ? <div className="h-8 w-28 bg-[#d6d5d0] dark:bg-[#2a2a28] rounded-sm animate-pulse" /> : formatCurrency(String(totalAvailable))}
                          </div>
                          <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-1">Вільні кошти для торгівлі</p>
                      </div>
                  </div>
              </div>

              {/* Assets Table */}
              <Card title="Активи">
                  {balances.length === 0 ? (
                      <div className="text-center py-10 font-mono text-xs uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
                          {isLoadingBalances ? '[ Завантаження... ]' : '[ Баланси відсутні ]'}
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="border-b border-[#d6d5d0] dark:border-[#2a2a28]">
                                  <tr>
                                      <th className="pb-3 pl-2 font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] font-normal">Актив</th>
                                      <th className="pb-3 text-right font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] font-normal">Всього</th>
                                      <th className="pb-3 text-right font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] font-normal">Доступно</th>
                                      <th className="pb-3 text-right pr-2 font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] font-normal">Угода</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f0efec] dark:divide-[#1a1a18]">
                                  {balances.map((b, idx) => (
                                      <tr key={idx} className="hover:bg-[#f0efec] dark:hover:bg-[#1a1a18] transition-colors">
                                          <td className="py-3.5 pl-2 font-semibold text-[#0d0d0b] dark:text-[#f0efec]">{b.asset}</td>
                                          <td className="py-3.5 text-right font-mono text-sm text-[#0d0d0b] dark:text-[#f0efec]">{b.amount}</td>
                                          <td className="py-3.5 text-right font-mono font-bold text-sm text-[#15700a] dark:text-[#5dde4a]">{b.available}</td>
                                          <td className="py-3.5 text-right font-mono text-sm text-[#71716b] dark:text-[#8a8a82] pr-2">{b.used}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </Card>
          </div>

          {/* Right Col: Points & Earn */}
          <div className="space-y-6">

              {/* Points Card */}
              <div className="bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm p-6">
                  <div className="flex justify-between items-start mb-6">
                      <h3 className="font-bold text-lg tracking-tight text-[#f0efec] dark:text-[#0d0d0b]">Points</h3>
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-[#1a1a18] dark:bg-[#e8e8e4]">
                         <Gem size={16} className="text-[#5dde4a]" />
                      </div>
                  </div>

                  {pointsStatus === 'loading' && (
                    <div className="font-mono text-xs text-[#8a8a82] dark:text-[#71716b] flex gap-2 items-center">
                      <RefreshCw size={12} className="animate-spin"/>
                      Оновлення...
                    </div>
                  )}

                  {pointsStatus === 'auth_required' && (
                      <div className="flex flex-col gap-3">
                          <div className="font-mono font-bold text-2xl text-[#8a8a82] dark:text-[#71716b] tracking-wider">LOCKED</div>
                          <div className="bg-[#1a1a18] dark:bg-[#e8e8e4] p-3 rounded-sm font-mono text-[11px] text-[#8a8a82] dark:text-[#71716b] flex gap-2 items-start">
                              <Lock size={12} className="shrink-0 mt-0.5" />
                              <span>API вимагає підпису.</span>
                          </div>
                      </div>
                  )}

                  {pointsStatus === 'error' && (
                      <div className="bg-[#1f0a0a] text-[#f08080] border border-[#4a1a1a] font-mono text-[11px] uppercase tracking-widest p-3 rounded-sm text-center">
                          Недоступно
                      </div>
                  )}

                  {pointsStatus === 'success' && points && (
                      <div>
                          <div className="font-mono font-bold text-5xl text-[#5dde4a] tracking-tighter">
                              {points.total.toLocaleString()}
                          </div>
                          <div className="mt-3">
                            <span className="font-mono text-[11px] uppercase tracking-widest text-[#8a8a82] dark:text-[#71716b] bg-[#1a1a18] dark:bg-[#e8e8e4] px-2 py-1 rounded-sm">
                                Сезон {points.season}
                            </span>
                          </div>
                          <div className="mt-6 pt-4 border-t border-[#2a2a28] dark:border-[#d6d5d0] font-mono text-[11px] text-[#8a8a82] dark:text-[#71716b]">
                              Оновлено: {new Date(points.updatedAt!).toLocaleTimeString()}
                          </div>
                      </div>
                  )}

                  {pointsStatus === 'idle' && !points && (
                    <div className="font-mono text-sm text-[#8a8a82] dark:text-[#71716b]">--</div>
                  )}
              </div>

              {/* Earn More */}
              <Card title="Як заробити?">
                  <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm hover:border-[#a0a09a] dark:hover:border-[#3a3a38] transition-colors">
                          <div className="w-8 h-8 rounded-sm bg-[#d6d5d0] dark:bg-[#2a2a28] flex items-center justify-center text-[#5dde4a] shrink-0">
                            <TrendingUp size={14} />
                          </div>
                          <div>
                              <div className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec]">Торгівля</div>
                              <div className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-0.5">Об'єм генерує поінти щоденно.</div>
                          </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm hover:border-[#a0a09a] dark:hover:border-[#3a3a38] transition-colors">
                          <div className="w-8 h-8 rounded-sm bg-[#d6d5d0] dark:bg-[#2a2a28] flex items-center justify-center text-[#5dde4a] shrink-0">
                            <Layers size={14} />
                          </div>
                          <div>
                              <div className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec]">Ліквідність</div>
                              <div className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-0.5">Мейкер ордери мають x2 буст.</div>
                          </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                          <a
                            href="https://ethereal.trade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full text-center py-3 bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] rounded-sm text-sm font-bold hover:opacity-90 active:scale-[0.99] transition-all"
                          >
                              Відкрити Ethereal <ExternalLink size={13} />
                          </a>
                          <a
                            href="https://docs.ethereal.trade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full text-center py-3 font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] transition-colors"
                          >
                               [ Читати правила ]
                          </a>
                      </div>
                  </div>
              </Card>

              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                  <details className="font-mono text-[11px] text-[#8a8a82] dark:text-[#8a8a82] cursor-pointer select-none">
                      <summary>Debug Info</summary>
                      <pre className="mt-2 p-3 bg-[#f0efec] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm overflow-x-auto">
                          API: https://api.ethereal.trade{"\n"}
                          Status: {pointsStatus}
                      </pre>
                  </details>
              )}
          </div>
      </div>
    </div>
  );
};
