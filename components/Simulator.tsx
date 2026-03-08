import React, { useState, useMemo } from 'react';
import { User, Project, Transaction } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SimulatorProps {
  transactions: Transaction[];
  projects: Project[];
  currentUser: User | 'ALL';
  currentProject: string;
}

export const Simulator: React.FC<SimulatorProps> = ({ transactions, projects, currentUser, currentProject }) => {
  const [predictionPrice, setPredictionPrice] = useState<string>('0.10');

  const stats = useMemo(() => {
    let totalSpent = 0; let totalPoints = 0;
    transactions.forEach(t => {
      if (t.deleted) return;
      if ((currentUser === 'ALL' || t.userId === currentUser) && (currentProject === 'ALL' || t.projectId === currentProject)) {
        totalSpent += t.spent || 0; totalPoints += t.points || 0;
      }
    });
    return { totalSpent, totalPoints };
  }, [transactions, currentUser, currentProject]);

  const predictedValue = stats.totalPoints * (parseFloat(predictionPrice) || 0);
  const predictedProfit = predictedValue - stats.totalSpent;
  const isProfit = predictedProfit >= 0;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page Header */}
      <div>
        <h1 className="font-black text-[2.5rem] tracking-tight leading-none text-[#0d0d0b] dark:text-[#f0efec]">
          Симулятор
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-2">
          Прогноз для{' '}
          <span className="text-[#0d0d0b] dark:text-[#f0efec] font-bold">
            {currentUser === 'ALL' ? 'всієї команди' : currentUser}
          </span>
        </p>
      </div>

      {/* Main Calculator */}
      <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative">
        <div className="p-6 sm:p-10 space-y-8">

          {/* Price Input */}
          <div className="space-y-3">
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
              Прогноз ціни токена
            </label>
            <div className="flex items-center bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm px-5 py-4 focus-within:border-[#5dde4a] focus-within:ring-2 focus-within:ring-[#5dde4a]/20 transition-all">
              <span className="font-mono text-2xl text-[#71716b] dark:text-[#8a8a82] mr-3 select-none">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={predictionPrice}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (e.target.value === '' || val >= 0) setPredictionPrice(e.target.value);
                }}
                className="bg-transparent font-mono font-bold text-5xl text-[#0d0d0b] dark:text-[#f0efec] focus:outline-none w-full tracking-tighter placeholder-[#71716b] dark:placeholder-[#8a8a82]"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">Всього поінтів</p>
              <p className="font-mono font-bold text-2xl text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">
                {stats.totalPoints.toLocaleString()}
              </p>
            </div>
            <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2">Витрачено</p>
              <p className="font-mono font-bold text-2xl text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>
          </div>

          {stats.totalPoints === 0 && stats.totalSpent === 0 && (
            <div className="text-center py-3">
              <p className="text-xs text-[#71716b] dark:text-[#8a8a82] leading-relaxed">
                Ще немає транзакцій для обраного проекту. Додайте звіт на дашборді.
              </p>
            </div>
          )}

          {/* PnL Result */}
          <div className="rounded-sm p-6 sm:p-8 border bg-[#e8e8e4] dark:bg-[#1a1a18] border-[#d6d5d0] dark:border-[#2a2a28]">
            <div className="flex justify-between items-center mb-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
                Чистий PnL
              </span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-sm border font-mono text-[11px] uppercase tracking-widest font-bold bg-[#d6d5d0] dark:bg-[#2a2a28] border-[#d6d5d0] dark:border-[#3a3a38] ${
                isProfit
                  ? 'text-[#15700a] dark:text-[#5dde4a]'
                  : 'text-[#c03030] dark:text-[#f08080]'
              }`}>
                {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {isProfit ? 'ПРИБУТОК' : 'ЗБИТОК'}
              </div>
            </div>
            <div className={`font-mono font-bold text-6xl sm:text-7xl tracking-tighter ${
              isProfit ? 'text-[#15700a] dark:text-[#5dde4a]' : 'text-[#c03030] dark:text-[#f08080]'
            }`}>
              {isProfit ? '+' : ''}{formatCurrency(predictedProfit)}
            </div>
            <div className={`mt-3 font-mono text-[12px] ${
              isProfit ? 'text-[#15700a] dark:text-[#7dde6a]' : 'text-[#c03030] dark:text-[#f08080]'
            }`}>
              Очікувана вартість: {formatCurrency(predictedValue)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
