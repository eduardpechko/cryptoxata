import React, { useMemo, useState, useEffect } from 'react';
import { User, Project, Transaction, MarketMetrics, Account } from '../types';
import { Card } from './ui/Card';
import { Loader2, ChevronRight, FileText, Plus } from 'lucide-react';
import { UserAvatar } from './ui/UserAvatar';

interface DashboardProps {
  transactions: Transaction[];
  projects: Project[];
  accounts: Account[];
  currentUser: User | 'ALL';
  currentProject: string;
  onEditClick: (transaction: Transaction) => void;
  onAddClick?: () => void;
  onProjectChange?: (projectId: string | 'ALL') => void;
  theme?: 'dark' | 'light';
}


const USER_ACCENT: Record<string, string> = {
  'Ед': '#3b82f6',
  'Вася': '#10b981',
  'Ден': '#f97316',
};

const ETHEREAL_ANALYTICS_MAP: Record<string, string> = {
  'Ед': '0x4a3ed65b03ac47902421beefbe17e4f425788232',
  'Вася': '',
  'Ден': ''
};

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  projects,
  accounts,
  currentUser,
  currentProject,
  onEditClick,
  onAddClick,
  onProjectChange,
  theme = 'light'
}) => {
  const [realtimeMetrics, setRealtimeMetrics] = useState<{ tvl?: string, volume24h?: string, openInterest?: string } | null>(null);
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);

  const activeProject = useMemo(() => projects.find(p => p.id === currentProject), [currentProject, projects]);

  useEffect(() => {
    setRealtimeMetrics(null);
    if (!activeProject?.defillamaId) return;

    const fetchData = async () => {
      setIsFetchingMetrics(true);
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2
        });
        const protocolPromise = fetch(`https://api.llama.fi/protocol/${activeProject.defillamaId}`).then(res => res.ok ? res.json() : null);
        const derivativesPromise = (async () => {
          try {
            const res = await fetch(`https://api.llama.fi/summary/derivatives/${activeProject.defillamaId}`);
            return res.ok ? await res.json() : null;
          } catch (e) { return null; }
        })();
        const dexPromise = fetch('https://api.llama.fi/summary/dexs?dataType=dailyVolume').then(res => res.ok ? res.json() : []);
        const [protocolData, derivativeData, dexList] = await Promise.all([protocolPromise, derivativesPromise, dexPromise]);

        let tvlValue = 0;
        if (protocolData) {
          const tvlArr = Array.isArray(protocolData.tvl) ? protocolData.tvl : [];
          tvlValue = tvlArr.length > 0 ? tvlArr[tvlArr.length - 1].totalLiquidityUSD : 0;
        }
        let volumeValue = 0, oiValue = 0;
        if (derivativeData) {
          const dataItem = Array.isArray(derivativeData) ? derivativeData[0] : derivativeData;
          if (dataItem) {
            oiValue = dataItem.openInterest || dataItem.totalOpenInterest || 0;
            volumeValue = dataItem.dailyVolume || dataItem.volume24h || dataItem.total24h || 0;
          }
        }
        if (volumeValue === 0) {
          const dexItem = Array.isArray(dexList) ? dexList.find((p: any) => p.slug === activeProject.defillamaId) : null;
          if (dexItem) volumeValue = dexItem.total24h || dexItem.dailyVolume || 0;
        }
        setRealtimeMetrics({
          tvl: tvlValue > 0 ? formatter.format(tvlValue) : undefined,
          volume24h: volumeValue > 0 ? formatter.format(volumeValue) : undefined,
          openInterest: oiValue > 0 ? formatter.format(oiValue) : undefined
        });
      } catch (error) {
        console.error("Failed to fetch protocol data:", error);
      } finally {
        setIsFetchingMetrics(false);
      }
    };
    fetchData();
  }, [activeProject]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.deleted) return false;
      const userMatch = currentUser === 'ALL' || t.userId === currentUser;
      const projectMatch = currentProject === 'ALL' || t.projectId === currentProject;
      return userMatch && projectMatch;
    });
  }, [transactions, currentUser, currentProject]);

  const groupedTransactions = useMemo(() => {
    const groups: { label: string; items: Transaction[] }[] = [];
    [...filteredTransactions].reverse().forEach(t => {
      const date = new Date(t.date), today = new Date(), yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      let label = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
      if (date.toDateString() === today.toDateString()) label = 'Сьогодні';
      else if (date.toDateString() === yesterday.toDateString()) label = 'Вчора';
      let group = groups.find(g => g.label === label);
      if (!group) { group = { label, items: [] }; groups.push(group); }
      group.items.push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    let totalSpent = 0, totalPoints = 0, totalVolume = 0;
    filteredTransactions.forEach(t => { totalSpent += t.spent || 0; totalPoints += t.points || 0; totalVolume += t.volume || 0; });
    return { totalSpent, totalPoints, totalVolume, avgCost: totalPoints > 0 ? totalSpent / totalPoints : 0 };
  }, [filteredTransactions]);

  const teamStats = useMemo(() => {
    const USERS = ['Ед', 'Вася', 'Ден'] as const;
    const colors: Record<string, string> = { 'Ед': '#3b82f6', 'Вася': '#10b981', 'Ден': '#f97316' };
    const perUser = USERS.map(userId => {
      const userTxs = transactions.filter(t => !t.deleted && t.userId === userId && (currentProject === 'ALL' || t.projectId === currentProject));
      const totalPoints = userTxs.reduce((s, t) => s + (t.points || 0), 0);
      const totalSpent = userTxs.reduce((s, t) => s + (t.spent || 0), 0);
      const avgCost = totalPoints > 0 ? totalSpent / totalPoints : 0;
      return { userId, totalPoints, totalSpent, avgCost, txCount: userTxs.length, color: colors[userId] };
    });
    const withPts = perUser.filter(u => u.totalPoints > 0);
    const withSpent = perUser.filter(u => u.totalSpent > 0);
    const withCost = perUser.filter(u => u.avgCost > 0);
    const maxPoints = withPts.length ? withPts.reduce((a, b) => a.totalPoints > b.totalPoints ? a : b) : null;
    const minPoints = withPts.length > 1 ? withPts.reduce((a, b) => a.totalPoints < b.totalPoints ? a : b) : null;
    const maxSpent  = withSpent.length > 1 ? withSpent.reduce((a, b) => a.totalSpent > b.totalSpent ? a : b) : null;
    const minSpent  = withSpent.length ? withSpent.reduce((a, b) => a.totalSpent < b.totalSpent ? a : b) : null;
    const maxCost   = withCost.length > 1 ? withCost.reduce((a, b) => a.avgCost > b.avgCost ? a : b) : null;
    const minCost   = withCost.length ? withCost.reduce((a, b) => a.avgCost < b.avgCost ? a : b) : null;
    return { perUser, maxPoints, minPoints, maxSpent, minSpent, maxCost, minCost };
  }, [transactions, currentProject]);

  const chartData = useMemo(() => {
    const data: Record<string, any> = {
      'Ед': { name: 'Ед', spent: 0, points: 0, fill: '#3b82f6' },
      'Вася': { name: 'Вася', spent: 0, points: 0, fill: '#10b981' },
      'Ден': { name: 'Ден', spent: 0, points: 0, fill: '#f97316' }
    };
    transactions.filter(t => !t.deleted && (currentProject === 'ALL' || t.projectId === currentProject)).forEach(t => {
      if (data[t.userId]) { data[t.userId].spent += (t.spent || 0); data[t.userId].points += (t.points || 0); }
    });
    return Object.values(data);
  }, [transactions, currentProject]);

  const growthData = useMemo(() => {
    const sorted = transactions.filter(t => !t.deleted && (currentProject === 'ALL' || t.projectId === currentProject)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) return [];
    const data: any[] = []; let cumulative = 0;
    if (sorted.length > 0) {
      const first = new Date(sorted[0].date); first.setDate(first.getDate() - 1);
      data.push({ date: first.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }), points: 0 });
    }
    sorted.forEach(t => {
      cumulative += Number(t.points || 0);
      const dateStr = new Date(t.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
      const last = data[data.length - 1];
      if (last && last.date === dateStr) last.points = cumulative;
      else data.push({ date: dateStr, points: cumulative });
    });
    return data;
  }, [transactions, currentProject]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  const displayMetrics: MarketMetrics = realtimeMetrics || activeProject?.metrics || {};
  const tickColor = theme === 'dark' ? '#8a8a82' : '#71716b';

  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-slide-up">
      {/* Page Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-black text-[2.5rem] tracking-tight text-[#0d0d0b] dark:text-[#f0efec] leading-none">Огляд</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-2">
            Аналітика · <span className="text-[#0d0d0b] dark:text-[#f0efec]">{currentUser === 'ALL' ? 'Вся команда' : currentUser}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onProjectChange && projects.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => onProjectChange('ALL')}
                className={`inline-flex items-center h-10 px-3.5 rounded-sm font-mono text-[11px] uppercase tracking-widest border transition-colors ${
                  currentProject === 'ALL'
                    ? 'bg-[#0d0d0b] text-[#f0efec] border-[#0d0d0b] dark:bg-[#f0efec] dark:text-[#0d0d0b] dark:border-[#f0efec]'
                    : 'bg-transparent text-[#71716b] border-[#d6d5d0] hover:border-[#a0a09a] dark:text-[#8a8a82] dark:border-[#2a2a28] dark:hover:border-[#4a4a48]'
                }`}
              >
                Всі
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onProjectChange(p.id)}
                  className={`inline-flex items-center h-10 px-3.5 rounded-sm font-mono text-[11px] uppercase tracking-widest border transition-colors ${
                    currentProject === p.id
                      ? 'bg-[#0d0d0b] text-[#f0efec] border-[#0d0d0b] dark:bg-[#f0efec] dark:text-[#0d0d0b] dark:border-[#f0efec]'
                      : 'bg-transparent text-[#71716b] border-[#d6d5d0] hover:border-[#a0a09a] dark:text-[#8a8a82] dark:border-[#2a2a28] dark:hover:border-[#4a4a48]'
                  }`}
                >
                  {p.ticker || p.name}
                </button>
              ))}
            </div>
          )}
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="hidden md:inline-flex items-center justify-center h-10 px-4 gap-1.5 bg-[#5dde4a] hover:bg-[#4cc43a] text-[#0d0d0b] font-semibold rounded-sm text-sm active:scale-[0.99] transition-all shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Звіт</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile project filter chips */}
      {onProjectChange && projects.length > 0 && (
        <div className="md:hidden flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => onProjectChange('ALL')}
            className={`shrink-0 h-8 px-3 rounded-sm font-mono text-[10px] uppercase tracking-widest border transition-colors ${
              currentProject === 'ALL'
                ? 'bg-[#0d0d0b] text-[#f0efec] border-[#0d0d0b] dark:bg-[#f0efec] dark:text-[#0d0d0b] dark:border-[#f0efec]'
                : 'bg-transparent text-[#71716b] border-[#d6d5d0] dark:text-[#8a8a82] dark:border-[#2a2a28]'
            }`}
          >Всі</button>
          {projects.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProjectChange(p.id)}
              className={`shrink-0 h-8 px-3 rounded-sm font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                currentProject === p.id
                  ? 'bg-[#0d0d0b] text-[#f0efec] border-[#0d0d0b] dark:bg-[#f0efec] dark:text-[#0d0d0b] dark:border-[#f0efec]'
                  : 'bg-transparent text-[#71716b] border-[#d6d5d0] dark:text-[#8a8a82] dark:border-[#2a2a28]'
              }`}
            >{p.ticker || p.name}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column — stacked content */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Points */}
            <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative p-3 sm:p-5 flex flex-col justify-between min-h-[90px] sm:min-h-[130px]">
              <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] leading-tight">Поінти</p>
              <div className="mt-1 space-y-0.5">
                <div className="font-mono font-black text-xl sm:text-3xl md:text-4xl text-[#0d0d0b] dark:text-[#f0efec] tracking-tight leading-none">{formatNumber(stats.totalPoints)}</div>
                <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[#15700a] dark:text-[#5dde4a]">PTS</div>
              </div>
            </div>
            {/* Spent */}
            <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative p-3 sm:p-5 flex flex-col justify-between min-h-[90px] sm:min-h-[130px]">
              <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] leading-tight">Витрачено</p>
              <div className="mt-1 space-y-0.5">
                <div className="font-mono font-black text-xl sm:text-3xl md:text-4xl text-[#0d0d0b] dark:text-[#f0efec] tracking-tight leading-none">{formatCurrency(stats.totalSpent)}</div>
                <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">USD</div>
              </div>
            </div>
            {/* Cost per point */}
            <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative p-3 sm:p-5 flex flex-col justify-between min-h-[90px] sm:min-h-[130px]">
              <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] leading-tight">Ціна PTS</p>
              <div className="mt-1 space-y-0.5">
                <div className="font-mono font-black text-xl sm:text-3xl md:text-4xl text-[#0d0d0b] dark:text-[#f0efec] tracking-tight leading-none">
                  {stats.avgCost === 0 ? '$0.00' : `$${stats.avgCost.toFixed(4)}`}
                </div>
                <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">за PTS</div>
              </div>
            </div>
          </div>

          {/* Team Comparison */}
          <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative p-5">
            <div className="mb-4">
              <h3 className="font-black text-base text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">Команда</h3>
            </div>

            {/* Record mini-cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {teamStats.maxPoints && (
                <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">Поінти</p>
                  <div className="flex items-center gap-2">
                    <div className="rounded-sm overflow-hidden shrink-0 border border-[#d6d5d0] dark:border-[#2a2a28]">
                      <UserAvatar userId={teamStats.maxPoints.userId} size={28} />
                    </div>
                    <p className="font-mono font-bold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{teamStats.maxPoints.userId}</p>
                  </div>
                  <p className="font-mono text-xs text-[#15700a] dark:text-[#5dde4a] mt-1.5">{formatNumber(teamStats.maxPoints.totalPoints)} PTS</p>
                </div>
              )}
              {teamStats.minCost && (
                <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">Ціна PTS</p>
                  <div className="flex items-center gap-2">
                    <div className="rounded-sm overflow-hidden shrink-0 border border-[#d6d5d0] dark:border-[#2a2a28]">
                      <UserAvatar userId={teamStats.minCost.userId} size={28} />
                    </div>
                    <p className="font-mono font-bold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{teamStats.minCost.userId}</p>
                  </div>
                  <p className="font-mono text-xs text-[#15700a] dark:text-[#5dde4a] mt-1.5">${teamStats.minCost.avgCost.toFixed(4)}/PTS</p>
                </div>
              )}
              {teamStats.minSpent && (
                <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">Витрати</p>
                  <div className="flex items-center gap-2">
                    <div className="rounded-sm overflow-hidden shrink-0 border border-[#d6d5d0] dark:border-[#2a2a28]">
                      <UserAvatar userId={teamStats.minSpent.userId} size={28} />
                    </div>
                    <p className="font-mono font-bold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{teamStats.minSpent.userId}</p>
                  </div>
                  <p className="font-mono text-xs text-[#15700a] dark:text-[#5dde4a] mt-1.5">{formatCurrency(teamStats.minSpent.totalSpent)}</p>
                </div>
              )}
            </div>

            {/* Comparison table */}
            <div className="border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 bg-[#e8e8e4] dark:bg-[#1a1a18] border-b border-[#d6d5d0] dark:border-[#2a2a28]">
                <div className="px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">Метрика</span>
                </div>
                {teamStats.perUser.map(u => (
                  <div key={u.userId} className="px-2 py-2 border-l border-[#d6d5d0] dark:border-[#2a2a28] flex items-center gap-1.5">
                    <div className="rounded-sm overflow-hidden shrink-0">
                      <UserAvatar userId={u.userId} size={20} />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#0d0d0b] dark:text-[#f0efec]">{u.userId}</span>
                  </div>
                ))}
              </div>
              {/* Points */}
              {[
                {
                  label: 'Поінти',
                  getValue: (u: typeof teamStats.perUser[0]) => u.totalPoints > 0 ? formatNumber(u.totalPoints) : '—',
                  getBest: (u: typeof teamStats.perUser[0]) => teamStats.maxPoints?.userId === u.userId,
                  getWorst: (u: typeof teamStats.perUser[0]) => teamStats.minPoints?.userId === u.userId,
                  bestArrow: '▲', worstArrow: '',
                },
                {
                  label: 'Витрачено',
                  getValue: (u: typeof teamStats.perUser[0]) => u.totalSpent > 0 ? formatCurrency(u.totalSpent) : '—',
                  getBest: (u: typeof teamStats.perUser[0]) => teamStats.minSpent?.userId === u.userId,
                  getWorst: (u: typeof teamStats.perUser[0]) => teamStats.maxSpent?.userId === u.userId,
                  bestArrow: '▼', worstArrow: '▲',
                },
                {
                  label: 'Ціна / PTS',
                  getValue: (u: typeof teamStats.perUser[0]) => u.avgCost > 0 ? `$${u.avgCost.toFixed(4)}` : '—',
                  getBest: (u: typeof teamStats.perUser[0]) => teamStats.minCost?.userId === u.userId,
                  getWorst: (u: typeof teamStats.perUser[0]) => teamStats.maxCost?.userId === u.userId,
                  bestArrow: '▼', worstArrow: '▲',
                },
              ].map((row, rowIdx, arr) => (
                <div key={row.label} className={`grid grid-cols-4 ${rowIdx < arr.length - 1 ? 'border-b border-[#d6d5d0] dark:border-[#2a2a28]' : ''}`}>
                  <div className="px-3 py-2.5 flex items-center">
                    <span className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82]">{row.label}</span>
                  </div>
                  {teamStats.perUser.map(u => {
                    const isBest = row.getBest(u);
                    const isWorst = row.getWorst(u);
                    return (
                      <div key={u.userId} className={`px-3 py-2.5 border-l border-[#d6d5d0] dark:border-[#2a2a28] ${isBest ? 'bg-[#5dde4a]/10 dark:bg-[#5dde4a]/5' : ''}`}>
                        <span className={`font-mono text-[11px] font-bold ${isBest ? 'text-[#15700a] dark:text-[#5dde4a]' : isWorst ? 'text-[#c03030] dark:text-[#f08080]' : 'text-[#0d0d0b] dark:text-[#f0efec]'}`}>
                          {row.getValue(u)}
                          {isBest && row.bestArrow && <span className="ml-0.5 text-[9px]"> {row.bestArrow}</span>}
                          {isWorst && row.worstArrow && <span className="ml-0.5 text-[9px]"> {row.worstArrow}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Protocol metrics */}
          <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-base text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">Протокол</h3>
                <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-0.5">Ринкові дані · DeFiLlama</p>
              </div>
              {isFetchingMetrics && <Loader2 size={14} className="animate-spin text-[#5dde4a]" />}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'TVL', value: displayMetrics.tvl || '—' },
                { label: 'Vol 24h', value: displayMetrics.volume24h || '—' },
                { label: 'OI', value: displayMetrics.openInterest || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-3.5">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">{label}</p>
                  {isFetchingMetrics && !realtimeMetrics ? (
                    <div className="h-7 w-24 bg-[#d6d5d0] dark:bg-[#2a2a28] rounded-sm animate-pulse" />
                  ) : (
                    <p className="font-mono font-bold text-xl text-[#0d0d0b] dark:text-[#f0efec]">{value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>{/* end left column */}

        {/* Right column — Transaction history */}
        {/* UX: Nielsen #1 (System Status), #4 (Consistency), #6 (Recognition), #7 (Flexibility) */}
        {/* Gestalt: Proximity grouping with counts. Signifiers: chevron affordance. */}
        <div className="lg:col-span-4 lg:self-start lg:sticky lg:top-4">
          <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
            {/* Header — Nielsen #1: show count for system status visibility */}
            <div className="px-5 pt-5 pb-4 border-b border-[#d6d5d0] dark:border-[#2a2a28] flex items-start justify-between">
              <div>
                <h3 className="font-black text-base text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">Історія</h3>
                <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-0.5">
                  [ {filteredTransactions.length} {filteredTransactions.length === 1 ? 'запис' : filteredTransactions.length >= 2 && filteredTransactions.length <= 4 ? 'записи' : 'записів'} ]
                </p>
              </div>
              {/* Nielsen #7: Quick add shortcut for efficiency */}
              {onAddClick && (
                <button
                  onClick={onAddClick}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] rounded-sm transition-colors"
                  title="Додати запис"
                  aria-label="Додати новий запис"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-5">
              {/* Nielsen #1: Enhanced empty state — guide user to action */}
              {groupedTransactions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-12 h-12 bg-[#e8e8e4] dark:bg-[#2a2a28] rounded-sm flex items-center justify-center">
                    <FileText size={20} className="text-[#71716b] dark:text-[#8a8a82]" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">[ Немає записів ]</p>
                    <p className="text-xs text-[#71716b] dark:text-[#8a8a82] mt-2 max-w-[200px] leading-relaxed">
                      Додайте першу активність, щоб бачити історію тут
                    </p>
                  </div>
                  {onAddClick && (
                    <button
                      onClick={onAddClick}
                      className="flex items-center gap-1.5 bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] font-semibold px-4 py-2 rounded-sm text-sm hover:opacity-90 active:scale-[0.99] transition-all mt-2"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Додати запис
                    </button>
                  )}
                </div>
              )}
              {groupedTransactions.map(group => (
                <div key={group.label} className="space-y-2">
                  {/* Gestalt Proximity: date group header with item count for scannability */}
                  <div className="flex items-center gap-2 px-1">
                    <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] shrink-0">{group.label}</h4>
                    <div className="flex-1 h-px bg-[#d6d5d0] dark:bg-[#2a2a28]" />
                    <span className="font-mono text-[10px] text-[#71716b] dark:text-[#8a8a82] bg-[#e8e8e4] dark:bg-[#2a2a28] px-1.5 py-0.5 rounded-sm shrink-0">{group.items.length}</span>
                  </div>
                  {group.items.map(t => {
                    const account = accounts.find(a => a.id === t.accountId);
                    const project = projects.find(p => p.id === t.projectId);
                    const startFmt = new Date(t.startDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
                    const endFmt = new Date(t.endDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
                    return (
                      <div
                        key={t.id}
                        onClick={() => onEditClick(t)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditClick(t); } }}
                        aria-label={`${t.userId} — ${project?.name || 'Запис'}, ${formatNumber(t.points)} поінтів, ${startFmt} — ${endFmt}`}
                        className="group/item bg-[#f0efec] dark:bg-[#1a1a18] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] border border-l-2 border-[#d6d5d0] dark:border-[#2a2a28] hover:border-[#a0a09a] dark:hover:border-[#3a3a38] p-3 rounded-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#5dde4a]/40 focus:border-[#5dde4a]"
                        style={{ borderLeftColor: USER_ACCENT[t.userId] || '#d6d5d0' }}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Avatar — top-aligned */}
                          <div className="w-8 h-8 rounded-sm overflow-hidden border border-[#d6d5d0] dark:border-[#2a2a28] shrink-0 mt-0.5">
                            <UserAvatar userId={t.userId} size={32} />
                          </div>
                          {/* Content: left meta + right PTS dominant */}
                          <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                            {/* Left: identity + date */}
                            <div className="min-w-0 flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec] leading-tight shrink-0">{t.userId}</span>
                                <span className="font-mono text-[10px] text-[#a0a09a] dark:text-[#5a5a58] leading-none shrink-0">/ {project?.name || t.projectId}</span>
                                {account?.name && (
                                  <span className="font-mono text-[10px] text-[#71716b] dark:text-[#8a8a82] leading-none shrink-0">#{account.name}</span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-[#71716b] dark:text-[#8a8a82] flex items-center gap-1.5 flex-wrap">
                                <span>{startFmt} — {endFmt}</span>
                                {t.spent > 0 && <span className="text-[#a0a09a] dark:text-[#5a5a58]">· −{formatCurrency(t.spent)}</span>}
                              </div>
                              {t.note && (
                                <p className="font-mono text-[10px] text-[#71716b] dark:text-[#8a8a82] leading-relaxed line-clamp-1">💬 {t.note}</p>
                              )}
                            </div>
                            {/* Right: PTS — the primary data point */}
                            <div className="shrink-0 flex flex-col items-end gap-0.5">
                              <div className="font-mono font-black text-lg leading-none text-[#15700a] dark:text-[#5dde4a]">+{formatNumber(t.points)}</div>
                              <div className="font-mono text-[10px] uppercase tracking-widest text-[#15700a]/70 dark:text-[#5dde4a]/60">PTS</div>
                              <ChevronRight size={11} className="text-[#c8c8c2] dark:text-[#3a3a38] group-hover/item:text-[#71716b] dark:group-hover/item:text-[#f0efec] transition-colors mt-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
