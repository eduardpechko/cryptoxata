import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Command, ChevronDown, Check, AlertTriangle, Loader2, Save, FileSpreadsheet, Plus, Zap, Download, Moon, Sun, Briefcase, Wallet } from 'lucide-react';

import { AppState, User, Project, SyncConfig, Transaction, Account } from './types';
import { loadData, saveData, createTransaction, createAccount, exportDataToJson, exportDataToCsv, subscribeToData } from './services/dataService';
import { USERS } from './constants';
import { Dashboard } from './components/Dashboard';
import { Simulator } from './components/Simulator';
import { TransactionForm } from './components/TransactionForm';
import { AccountManager } from './components/AccountManager';
import { Card } from './components/ui/Card';
import { Modal } from './components/ui/Modal';
import { ToastContainer, toast } from './components/ui/Toast';
import { UserAvatar } from './components/ui/UserAvatar';

export const App: React.FC = () => {
  // Theme State — light mode is primary
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'dark' | 'light';
    }
    return 'light';
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppState>({ transactions: [], projects: [], accounts: [] });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [currentUserFilter, setCurrentUserFilter] = useState<User | 'ALL'>('ALL');
  const [currentProjectFilter, setCurrentProjectFilter] = useState<string>('ALL');

  const [newProjectName, setNewProjectName] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [accountManagerInitialUser, setAccountManagerInitialUser] = useState<User | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [syncForm, setSyncForm] = useState<SyncConfig>({
    enabled: false, supabaseUrl: '', supabaseKey: '', tableName: 'sync_store', rowId: 'cryptoxata_v1'
  });

  const isRemoteUpdate = useRef(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a08' : '#f0efec');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    loadData().then(result => {
      setData(result.data);
      if (result.data.syncConfig) setSyncForm(result.data.syncConfig);
      if (result.error) setSyncError(result.error);
      setLoading(false);
      if (result.data.projects.length > 0) {
        setCurrentProjectFilter(result.data.projects[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (loading || !data.syncConfig?.enabled) return;
    const unsubscribe = subscribeToData(data.syncConfig, (remoteData) => {
      isRemoteUpdate.current = true;
      setData(prev => ({
        ...prev,
        transactions: remoteData.transactions,
        projects: remoteData.projects,
        accounts: remoteData.accounts || []
      }));
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1500);
      setSyncError(null);
    });
    return () => { unsubscribe(); };
  }, [loading, data.syncConfig?.enabled, data.syncConfig?.supabaseUrl, data.syncConfig?.rowId]);

  useEffect(() => {
    if (loading) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSyncing(true);
    saveTimeoutRef.current = setTimeout(() => {
      saveData(data).then((res) => {
        if (!res.success && res.error) {
          setSyncError(res.error);
          toast.error('Помилка синхронізації');
        } else {
          setSyncError(null);
        }
        setTimeout(() => setIsSyncing(false), 500);
      });
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [data, loading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTransaction = (userId: User, accountId: string | undefined, projectId: string, spent: number, volume: number, points: number, startDate: string, endDate: string, note: string) => {
    const date = new Date().toISOString();
    const newTx = createTransaction({ userId, accountId, projectId, spent, volume, points, date, startDate, endDate, note });
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTx] }));
    toast.success('Звіт збережено');
  };

  const handleEditTransaction = (id: string, userId: User, accountId: string | undefined, projectId: string, spent: number, volume: number, points: number, startDate: string, endDate: string, note: string) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t =>
        t.id === id
          ? { ...t, userId, accountId, projectId, spent, volume, points, startDate, endDate, note, updatedAt: now }
          : t
      )
    }));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast.success('Звіт оновлено');
  };

  const handleDeleteTransaction = (id: string) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t =>
        t.id === id ? { ...t, deleted: true, updatedAt: now } : t
      )
    }));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast.success('Звіт видалено');
  };

  const handleAddAccount = (accountData: Omit<Account, 'id' | 'deleted' | 'updatedAt'>) => {
    const newAccount = createAccount(accountData);
    setData(prev => ({ ...prev, accounts: [...(prev.accounts || []), newAccount] }));
    toast.success('Акаунт створено');
  };

  const handleUpdateAccount = (account: Account) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === account.id ? { ...account, updatedAt: now } : a)
    }));
    toast.success('Акаунт оновлено');
  };

  const handleDeleteAccount = (id: string) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, deleted: true, updatedAt: now } : a)
    }));
    toast.success('Акаунт видалено');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProject: Project = { id: `p-${Date.now()}`, name: newProjectName, ticker: newProjectName.slice(0, 3).toUpperCase() };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
    setNewProjectName('');
    toast.success('Проект додано');
  };

  const handleSaveSyncConfig = () => {
    setData(prev => ({ ...prev, syncConfig: syncForm }));
    saveData({ ...data, syncConfig: syncForm }).then(() => {
      toast.success('Налаштування синхронізації збережено');
    });
  };

  // Shared design tokens
  const inputClass = "w-full bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm px-3.5 py-2.5 text-sm font-sans text-[#0d0d0b] dark:text-[#f0efec] focus:border-[#5dde4a] focus:ring-2 focus:ring-[#5dde4a]/20 focus:outline-none transition-colors placeholder-[#71716b] dark:placeholder-[#8a8a82]";
  const btnPrimary = "bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] rounded-sm px-5 py-2.5 text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all";
  const btnBracket = "font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] transition-colors";

  const currentProjectName = currentProjectFilter === 'ALL' ? 'Всі проекти' : data.projects.find(p => p.id === currentProjectFilter)?.name || 'Проект';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0efec] dark:bg-[#0a0a08]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#5dde4a]" size={36} />
          <p className="font-mono text-xs uppercase tracking-widest text-[#71716b]">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen text-[#0d0d0b] dark:text-[#f0efec] bg-[#f0efec] dark:bg-[#0a0a08] transition-colors duration-200">

        {/* Desktop Top Navigation */}
        <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-14 bg-[#f5f5f0] dark:bg-[#141412] border-b border-[#d6d5d0] dark:border-[#2a2a28] items-center px-6 gap-6">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm flex items-center justify-center">
              <Command size={14} className="text-[#f0efec] dark:text-[#0d0d0b]" />
            </div>
            <span className="font-black text-sm tracking-tight text-[#0d0d0b] dark:text-[#f0efec]">CRYPTOXATA</span>
            {data.syncConfig?.enabled && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : isSyncing ? 'bg-[#5dde4a] animate-pulse' : 'bg-[#5dde4a]'}`} />
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
                  {syncError ? 'ERR' : isSyncing ? 'SYNC' : 'LIVE'}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-[#d6d5d0] dark:bg-[#2a2a28]" />

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 h-10 px-3.5 text-sm font-medium transition-colors rounded-sm ${
                  isActive
                    ? 'text-[#0d0d0b] dark:text-[#f0efec] bg-[#e8e8e4] dark:bg-[#2a2a28]'
                    : 'text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18]'
                }`
              }
            >
              <LayoutDashboard size={15} />
              <span>Дашборд</span>
            </NavLink>
            <NavLink
              to="/simulator"
              className={({ isActive }) =>
                `flex items-center gap-2 h-10 px-3.5 text-sm font-medium transition-colors rounded-sm ${
                  isActive
                    ? 'text-[#0d0d0b] dark:text-[#f0efec] bg-[#e8e8e4] dark:bg-[#2a2a28]'
                    : 'text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18]'
                }`
              }
            >
              <Zap size={15} />
              <span>Симулятор</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 h-10 px-3.5 text-sm font-medium transition-colors rounded-sm ${
                  isActive
                    ? 'text-[#0d0d0b] dark:text-[#f0efec] bg-[#e8e8e4] dark:bg-[#2a2a28]'
                    : 'text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18]'
                }`
              }
            >
              <Settings size={15} />
              <span>Налаштування</span>
            </NavLink>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side controls */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="min-w-[44px] h-10 flex items-center justify-center rounded-sm text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] transition-colors"
              title={theme === 'dark' ? '[ LIGHT ]' : '[ DARK ]'}
              aria-label={theme === 'dark' ? 'Переключити на світлу тему' : 'Переключити на темну тему'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* User Selector */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="h-10 flex items-center gap-2 pl-1.5 pr-2.5 border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] transition-colors"
              >
                <div className="w-6 h-6 rounded-sm overflow-hidden border border-[#d6d5d0] dark:border-[#2a2a28] shrink-0">
                  <UserAvatar userId={currentUserFilter} size={24} />
                </div>
                <span className="text-xs font-semibold text-[#0d0d0b] dark:text-[#f0efec]">
                  {currentUserFilter === 'ALL' ? 'Всі' : currentUserFilter}
                </span>
                <ChevronDown size={11} className={`text-[#71716b] transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isUserDropdownOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-48 bg-[#f5f5f0] dark:bg-[#141412] rounded-sm border border-[#d6d5d0] dark:border-[#2a2a28] p-1 animate-scale-in origin-top-right z-50">
                  <button
                    onClick={() => { setCurrentUserFilter('ALL'); setIsUserDropdownOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18] transition-colors rounded-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-sm overflow-hidden border border-[#d6d5d0] dark:border-[#2a2a28] shrink-0">
                        <UserAvatar userId="ALL" size={20} />
                      </div>
                      <span>Вся Команда</span>
                    </div>
                    {currentUserFilter === 'ALL' && <Check size={13} className="text-[#5dde4a]" />}
                  </button>
                  <div className="h-px bg-[#d6d5d0] dark:bg-[#2a2a28] my-1" />
                  {USERS.map(u => (
                    <button
                      key={u}
                      onClick={() => { setCurrentUserFilter(u); setIsUserDropdownOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18] transition-colors rounded-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-sm overflow-hidden border border-[#d6d5d0] dark:border-[#2a2a28] shrink-0">
                          <UserAvatar userId={u} size={20} />
                        </div>
                        <span>{u}</span>
                      </div>
                      {currentUserFilter === u && <Check size={13} className="text-[#5dde4a]" />}
                    </button>
                  ))}
                  <div className="h-px bg-[#d6d5d0] dark:bg-[#2a2a28] my-1" />
                  <button
                    onClick={() => { setIsAccountManagerOpen(true); setIsUserDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#0d0d0b] dark:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18] transition-colors rounded-sm font-medium"
                  >
                    <Wallet size={14} className="text-[#71716b]" />
                    <span>Керування акаунтами</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <div className="lg:hidden flex justify-between items-center px-4 py-3 sticky top-0 z-30 bg-[#f5f5f0] dark:bg-[#141412] border-b border-[#d6d5d0] dark:border-[#2a2a28] pt-safe transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm flex items-center justify-center">
              <Command size={13} className="text-[#f0efec] dark:text-[#0d0d0b]" />
            </div>
            <span className="font-black text-sm tracking-tight text-[#0d0d0b] dark:text-[#f0efec]">CRYPTOXATA</span>
            {data.syncConfig?.enabled && (
              <span className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-[#c03030]' : isSyncing ? 'bg-[#5dde4a] animate-pulse' : 'bg-[#5dde4a]'}`} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-11 h-11 flex items-center justify-center rounded-sm bg-[#e8e8e4] dark:bg-[#2a2a28] text-[#71716b] dark:text-[#8a8a82]"
              aria-label={theme === 'dark' ? 'Переключити на світлу тему' : 'Переключити на темну тему'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-[#e8e8e4] dark:bg-[#1a1a18] rounded-sm pl-1 pr-2.5 py-1 border border-[#d6d5d0] dark:border-[#2a2a28]">
                <div className="w-5 h-5 rounded-sm overflow-hidden border border-[#d6d5d0] dark:border-[#2a2a28] shrink-0">
                  <UserAvatar userId={currentUserFilter} size={20} />
                </div>
                <span className="text-xs font-semibold text-[#0d0d0b] dark:text-[#f0efec]">{currentUserFilter === 'ALL' ? 'Всі' : currentUserFilter}</span>
                <ChevronDown size={10} className="text-[#71716b]" />
              </div>
              <select
                value={currentUserFilter}
                onChange={(e) => setCurrentUserFilter(e.target.value as User | 'ALL')}
                className="absolute inset-0 w-full h-full opacity-0 z-10"
                aria-label="Вибрати користувача"
              >
                <option value="ALL">Всі</option>
                {USERS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 lg:pt-[calc(3.5rem+2rem)] pb-28 lg:pb-8">
          <Routes>
            <Route path="/" element={
              <Dashboard
                transactions={data.transactions}
                projects={data.projects}
                accounts={data.accounts || []}
                currentUser={currentUserFilter}
                currentProject={currentProjectFilter}
                theme={theme}
                onEditClick={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
                onAddClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                onProjectChange={(projectId) => setCurrentProjectFilter(projectId)}
              />
            } />
            <Route path="/simulator" element={
              <Simulator
                transactions={data.transactions}
                projects={data.projects}
                currentUser={currentUserFilter}
                currentProject={currentProjectFilter}
              />
            } />
            <Route path="/settings" element={
              <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
                <div>
                  <h1 className="font-black text-[2rem] tracking-tight text-[#0d0d0b] dark:text-[#f0efec] leading-none">Налаштування</h1>
                  <p className="font-mono text-xs uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-2">Керування підключеннями та даними</p>
                </div>

                <Card title="Акаунти та Гаманці" subtitle="Керуйте акаунтами користувачів">
                  <div className="flex items-center justify-between p-4 bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm flex items-center justify-center">
                        <Wallet size={15} className="text-[#f0efec] dark:text-[#0d0d0b]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec]">Керування акаунтами</h3>
                        <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-0.5">Гаманці, проксі, профілі</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setAccountManagerInitialUser(undefined); setIsAccountManagerOpen(true); }}
                      className={btnPrimary}
                    >
                      Відкрити
                    </button>
                  </div>
                </Card>

                <Card title="Хмарна синхронізація" subtitle="Supabase Connection" className={syncError ? 'border-red-400/50' : ''}>
                  <div className="space-y-5">
                    {syncError && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-sm text-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold"><AlertTriangle size={15} /><span>Помилка з'єднання</span></div>
                        <p className="text-red-600/80 dark:text-red-400/70 font-mono text-xs">{syncError}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="syncEnabled"
                        checked={syncForm.enabled}
                        onChange={e => setSyncForm({ ...syncForm, enabled: e.target.checked })}
                        className="w-4 h-4 rounded-sm border-[#d6d5d0] dark:border-[#2a2a28] text-[#5dde4a] focus:ring-[#5dde4a] focus:ring-offset-0"
                      />
                      <label htmlFor="syncEnabled" className="text-sm font-semibold cursor-pointer text-[#0d0d0b] dark:text-[#f0efec]">Активувати синхронізацію</label>
                    </div>
                    {syncForm.enabled && (
                      <div className="space-y-4 bg-[#e8e8e4] dark:bg-[#1a1a18] p-4 border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm">
                        <div>
                          <label className="block font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">URL Проекту</label>
                          <input type="text" value={syncForm.supabaseUrl} onChange={e => setSyncForm({ ...syncForm, supabaseUrl: e.target.value })} className={inputClass} placeholder="https://..." />
                        </div>
                        <div>
                          <label className="block font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">API Ключ</label>
                          <input type="password" value={syncForm.supabaseKey} onChange={e => setSyncForm({ ...syncForm, supabaseKey: e.target.value })} className={`${inputClass} font-mono`} placeholder="eyJ..." />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-1">
                      <button onClick={() => setIsSetupModalOpen(true)} className={btnBracket}>
                        [ SQL Інструкція ]
                      </button>
                      <button onClick={handleSaveSyncConfig} className={btnPrimary}>
                        <Save size={14} className="inline mr-1.5" />Зберегти
                      </button>
                    </div>
                  </div>
                </Card>

                <Card title="Список Проектів">
                  <ul className="space-y-2 mb-5">
                    {data.projects.map(p => (
                      <li key={p.id} className="flex items-center justify-between p-3.5 bg-[#f0efec] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm hover:border-[#a0a09a] dark:hover:border-[#3a3a38] transition-colors">
                        <span className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{p.name}</span>
                        <span className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] uppercase bg-[#e8e8e4] dark:bg-[#2a2a28] px-2 py-0.5 border border-[#d6d5d0] dark:border-[#3a3a38]">{p.ticker || p.id}</span>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={handleAddProject} className="flex gap-2">
                    <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Назва нового проекту..." className={inputClass} />
                    <button type="submit" className={`${btnPrimary} whitespace-nowrap`}>Додати</button>
                  </form>
                </Card>

                <div className="flex gap-6 justify-center">
                  <button onClick={() => { exportDataToJson(data); toast.success('Резервну копію збережено'); }} className={`${btnBracket} flex items-center gap-1.5`}>
                    <Download size={12} />[ Експорт JSON ]
                  </button>
                  <button onClick={() => { exportDataToCsv(data); toast.success('CSV файл збережено'); }} className={`${btnBracket} flex items-center gap-1.5`}>
                    <FileSpreadsheet size={12} />[ Експорт CSV ]
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </main>

        {/* Mobile Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f5f5f0] dark:bg-[#141412] border-t border-[#d6d5d0] dark:border-[#2a2a28] pb-safe transition-colors">
          <div className="grid grid-cols-4 items-center h-[3.5rem] px-1">
            <NavLink
              to="/"
              className={({ isActive }) => `flex flex-col items-center justify-center h-full gap-1 ${isActive ? 'text-[#0d0d0b] dark:text-[#f0efec]' : 'text-[#71716b] dark:text-[#8a8a82]'}`}
            >
              <LayoutDashboard size={19} />
              <span className="font-mono text-[11px] uppercase tracking-widest">Дашборд</span>
            </NavLink>
            <NavLink
              to="/simulator"
              className={({ isActive }) => `flex flex-col items-center justify-center h-full gap-1 ${isActive ? 'text-[#0d0d0b] dark:text-[#f0efec]' : 'text-[#71716b] dark:text-[#8a8a82]'}`}
            >
              <Zap size={19} />
              <span className="font-mono text-[11px] uppercase tracking-widest">Симулятор</span>
            </NavLink>
            <div className="flex justify-center items-center h-full">
              <button
                onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                className="bg-[#5dde4a] hover:bg-[#4cc43a] text-[#0d0d0b] w-11 h-11 rounded-sm flex items-center justify-center transition-colors active:scale-95"
                aria-label="Додати звіт"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) => `flex flex-col items-center justify-center h-full gap-1 ${isActive ? 'text-[#0d0d0b] dark:text-[#f0efec]' : 'text-[#71716b] dark:text-[#8a8a82]'}`}
            >
              <Settings size={19} />
              <span className="font-mono text-[11px] uppercase tracking-widest">Налашт.</span>
            </NavLink>
          </div>
        </nav>

        {/* Modals */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTransaction ? "Редагувати" : "Новий звіт"} noPadding={true}>
          <TransactionForm
            initialData={editingTransaction}
            projects={data.projects}
            accounts={data.accounts || []}
            onAdd={handleAddTransaction}
            onEdit={handleEditTransaction}
            onDelete={editingTransaction ? handleDeleteTransaction : undefined}
            onSuccess={() => setIsModalOpen(false)}
            onOpenAccountManager={(userId) => {
              setAccountManagerInitialUser(userId);
              setIsAccountManagerOpen(true);
            }}
          />
        </Modal>

        <AccountManager
          isOpen={isAccountManagerOpen}
          onClose={() => {
            setIsAccountManagerOpen(false);
            setAccountManagerInitialUser(undefined);
          }}
          accounts={data.accounts || []}
          users={USERS}
          initialUserId={accountManagerInitialUser}
          initialView={accountManagerInitialUser ? 'form' : 'list'}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
        />

        <Modal isOpen={isSetupModalOpen} onClose={() => setIsSetupModalOpen(false)} title="SQL Setup">
          <div className="space-y-4">
            <p className="text-sm text-[#71716b] dark:text-[#8a8a82]">Виконайте цей запит у Supabase SQL Editor:</p>
            <div className="bg-[#0d0d0b] rounded-sm p-4 overflow-x-auto border border-[#2a2a28]">
              <pre className="text-[#5dde4a] text-xs font-mono whitespace-pre-wrap">{`create table if not exists sync_store (id text primary key, data jsonb, updated_at timestamp with time zone default now());\nalter table sync_store enable row level security;\ncreate policy "Public Access" on sync_store for all using (true) with check (true);`}</pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`create table if not exists sync_store (id text primary key, data jsonb, updated_at timestamp with time zone default now()); alter table sync_store enable row level security; create policy "Public Access" on sync_store for all using (true) with check (true);`);
                toast.success('SQL скрипт скопійовано');
              }}
              className="w-full py-3 bg-[#e8e8e4] dark:bg-[#2a2a28] hover:bg-[#d6d5d0] dark:hover:bg-[#3a3a38] text-[#0d0d0b] dark:text-[#f0efec] rounded-sm text-sm font-semibold transition-colors"
            >
              [ Копіювати ]
            </button>
          </div>
        </Modal>
      </div>
      <ToastContainer />
    </Router>
  );
};
