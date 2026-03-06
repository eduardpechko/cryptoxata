import React, { useState, useEffect, useRef } from 'react';
import { User, Project, Transaction, Account } from '../types';
import { USERS } from '../constants';
import { Plus, Coins, Wallet, Calendar, ArrowRight, BarChart3, Receipt, Save, Trash2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface TransactionFormProps {
  projects: Project[];
  accounts: Account[];
  initialData?: Transaction | null;
  onAdd: (userId: User, accountId: string | undefined, projectId: string, spent: number, volume: number, points: number, startDate: string, endDate: string, note: string) => void;
  onEdit?: (id: string, userId: User, accountId: string | undefined, projectId: string, spent: number, volume: number, points: number, startDate: string, endDate: string, note: string) => void;
  onDelete?: (id: string) => void;
  onSuccess?: () => void;
  onOpenAccountManager?: (userId: User) => void;
}

const toLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '...';
  const date = new Date(dateStr);
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
};

const RangeCalendar = ({ startDate, endDate, onChange }: { startDate: string, endDate: string, onChange: (s: string, e: string) => void }) => {
  const [viewDate, setViewDate] = useState(() => startDate ? new Date(startDate) : new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const getDaysArray = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDay = firstDay.getDay(); startingDay = startingDay === 0 ? 6 : startingDay - 1;
    return { daysInMonth, startingDay };
  };
  const { daysInMonth, startingDay } = getDaysArray(viewDate.getFullYear(), viewDate.getMonth());
  const monthName = viewDate.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

  const handleDayClick = (day: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const clickedDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!startDate || (startDate && endDate)) {
      onChange(clickedDateStr, '');
    } else if (startDate && !endDate) {
      if (clickedDateStr < startDate) onChange(clickedDateStr, startDate);
      else onChange(startDate, clickedDateStr);
    }
  };

  return (
    <div className="bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-4 mt-2 animate-scale-in z-50 relative">
      <div className="flex justify-between items-center mb-4 px-1">
        <button
          type="button"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] rounded-sm transition-colors text-[#71716b] dark:text-[#8a8a82]"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => setShowMonthPicker(!showMonthPicker)}
          className="font-semibold text-sm capitalize text-[#0d0d0b] dark:text-[#f0efec] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] px-3 py-1.5 rounded-sm transition-colors"
        >
          {monthName}
        </button>
        <button
          type="button"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] rounded-sm transition-colors text-[#71716b] dark:text-[#8a8a82]"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {showMonthPicker && (
        <div className="mb-3 animate-scale-in">
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))}
              className="font-mono text-xs text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] px-2 py-1 rounded-sm hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] transition-colors"
            >
              {viewDate.getFullYear() - 1}
            </button>
            <span className="font-mono font-bold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{viewDate.getFullYear()}</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1))}
              className="font-mono text-xs text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] px-2 py-1 rounded-sm hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] transition-colors"
            >
              {viewDate.getFullYear() + 1}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setViewDate(new Date(viewDate.getFullYear(), i, 1));
                  setShowMonthPicker(false);
                }}
                className={`py-2 text-xs font-mono rounded-sm transition-colors capitalize ${
                  i === viewDate.getMonth()
                    ? 'bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] font-bold'
                    : 'text-[#71716b] dark:text-[#8a8a82] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28]'
                }`}
              >
                {new Date(2024, i).toLocaleString('uk-UA', { month: 'short' })}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-0.5">
        {weekDays.map(d => (
          <div key={d} className="text-center font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] py-1">{d}</div>
        ))}
        {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = startDate === dateStr || endDate === dateStr;
          const inRange = startDate && endDate && dateStr > startDate && dateStr < endDate;
          return (
            <button
              key={day}
              onClick={(e) => handleDayClick(day, e)}
              className={`h-11 w-full text-sm transition-colors rounded-sm font-mono ${
                selected
                  ? 'bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] font-bold'
                  : inRange
                  ? 'bg-[#e8e8e4] dark:bg-[#2a2a28] text-[#0d0d0b] dark:text-[#f0efec]'
                  : 'hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] text-[#0d0d0b] dark:text-[#f0efec]'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const TransactionForm: React.FC<TransactionFormProps> = ({ projects, accounts, initialData, onAdd, onEdit, onDelete, onSuccess, onOpenAccountManager }) => {
  const [userId, setUserId] = useState<User>(initialData?.userId || USERS[0]);
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || '');
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || projects[0]?.id || '');
  const [points, setPoints] = useState<string>(initialData?.points !== undefined ? String(initialData.points) : '');
  const [volume, setVolume] = useState<string>(initialData?.volume !== undefined ? String(initialData.volume) : '');
  const [spent, setSpent] = useState<string>(initialData?.spent !== undefined ? String(initialData.spent) : '');
  const [endDate, setEndDate] = useState<string>(initialData?.endDate || toLocalDateInput(new Date()));
  const [startDate, setStartDate] = useState<string>(initialData?.startDate || toLocalDateInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [note, setNote] = useState<string>(initialData?.note || '');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userAccounts = accounts.filter(a => a.userId === userId && !a.deleted);

  const prevUserAccountsLengthRef = useRef(userAccounts.length);
  useEffect(() => {
    if (userAccounts.length > prevUserAccountsLengthRef.current) {
      const newestAccount = [...userAccounts].sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      })[0];
      if (newestAccount) setAccountId(newestAccount.id);
    }
    prevUserAccountsLengthRef.current = userAccounts.length;
  }, [userAccounts]);

  useEffect(() => {
    const currentAccount = accounts.find(a => a.id === accountId);
    if (currentAccount && currentAccount.userId !== userId) setAccountId('');
  }, [userId, accounts, accountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!projectId) newErrors.project = 'Оберіть проект';
    if (!startDate) newErrors.date = 'Вкажіть дату початку';
    if (!endDate) newErrors.date = 'Вкажіть дату завершення';
    if (startDate && endDate && startDate > endDate) newErrors.date = 'Дата завершення має бути після початку';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSuccess(true);
    setTimeout(() => {
      const accId = accountId || undefined;
      if (initialData && onEdit) onEdit(initialData.id, userId, accId, projectId, parseFloat(spent) || 0, parseFloat(volume) || 0, parseFloat(points) || 0, startDate, endDate, note);
      else onAdd(userId, accId, projectId, parseFloat(spent) || 0, parseFloat(volume) || 0, parseFloat(points) || 0, startDate, endDate, note);
      if (onSuccess) onSuccess();
    }, 800);
  };

  const inputClass = "w-full bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm px-3.5 py-2.5 text-sm font-sans text-[#0d0d0b] dark:text-[#f0efec] focus:border-[#5dde4a] focus:ring-2 focus:ring-[#5dde4a]/20 focus:outline-none transition-colors placeholder-[#71716b] dark:placeholder-[#8a8a82]";
  const labelClass = "block font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2";

  if (isSuccess) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-scale-in">
      <div className="w-12 h-12 bg-[#5dde4a] rounded-sm flex items-center justify-center mb-4">
        <CheckCircle2 size={24} className="text-[#0d0d0b]" />
      </div>
      <h3 className="font-bold text-xl text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">Звіт збережено</h3>
      <p className="font-mono text-xs uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-1">Дані оновлено успішно</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">

        {/* Project + User */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Проект</label>
            <div className="relative">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass + " appearance-none pr-8"}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71716b] pointer-events-none" size={14} />
            </div>
            {errors.project && (
              <p className="font-mono text-[11px] text-[#c03030] dark:text-[#f08080] mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.project}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Користувач</label>
            <div className="relative">
              <select value={userId} onChange={(e) => setUserId(e.target.value as User)} className={inputClass + " appearance-none pr-8"}>
                {USERS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71716b] pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* Account */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className={labelClass} style={{ marginBottom: 0 }}>Акаунт / Гаманець</label>
            {onOpenAccountManager && (
              <button
                type="button"
                onClick={() => onOpenAccountManager(userId)}
                className="font-mono text-[11px] uppercase tracking-widest text-[#15700a] dark:text-[#5dde4a] hover:text-[#0d5a06] dark:hover:text-[#4cc43a] flex items-center gap-1 transition-colors"
              >
                <Plus size={11} /> [ Додати ]
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={inputClass + " appearance-none pr-8"}
              disabled={userAccounts.length === 0}
            >
              <option value="">{userAccounts.length === 0 ? 'Немає акаунтів' : 'Оберіть акаунт...'}</option>
              {userAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.walletAddress ? ` (${a.walletAddress.slice(0, 6)}...)` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71716b] pointer-events-none" size={14} />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className={labelClass}>Період</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className={inputClass + " flex justify-between items-center"}
            >
              <div className="flex items-center gap-2 text-[#0d0d0b] dark:text-[#f0efec]">
                <Calendar size={14} className="text-[#71716b] dark:text-[#8a8a82]" />
                <span className="font-mono text-xs">{formatDateDisplay(startDate)} — {formatDateDisplay(endDate)}</span>
              </div>
              <ChevronDown size={13} className={`text-[#71716b] transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
            </button>
            {showCalendar && (
              <div className="absolute top-full left-0 right-0 z-50">
                <RangeCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(s, e) => { setStartDate(s); setEndDate(e); if (s && e) setShowCalendar(false); }}
                />
              </div>
            )}
          </div>
          {errors.date && (
            <p className="font-mono text-[11px] text-[#c03030] dark:text-[#f08080] mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.date}
            </p>
          )}
        </div>

        {/* Points — primary metric */}
        <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-5">
          <label className="block font-mono text-[11px] uppercase tracking-widest text-[#15700a] dark:text-[#5dde4a] mb-3 flex items-center gap-1.5">
            <Coins size={12} />
            Отримані поінти
          </label>
          <input
            type="number"
            step="0.01"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-full bg-transparent font-mono font-bold text-5xl outline-none tracking-tight text-[#0d0d0b] dark:text-[#f0efec] placeholder-[#71716b]/50 dark:placeholder-[#8a8a82]"
            placeholder="0"
          />
          <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-2 opacity-60">Кількість поінтів за цей період</p>
        </div>

        {/* Volume + Spent */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-4">
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2 flex items-center gap-1">
              <BarChart3 size={11} />Об'єм ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full bg-transparent font-mono font-bold text-xl outline-none text-[#0d0d0b] dark:text-[#f0efec] placeholder-[#71716b]/50"
              placeholder="0"
            />
            <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-2 opacity-60">Торговий об'єм</p>
          </div>
          <div className="bg-[#e8e8e4] dark:bg-[#1a1a18] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-4">
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#c03030] dark:text-[#f08080] mb-2 flex items-center gap-1">
              <Receipt size={11} />Витрати ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
              className="w-full bg-transparent font-mono font-bold text-xl outline-none text-[#0d0d0b] dark:text-[#f0efec] placeholder-[#71716b]/50"
              placeholder="0"
            />
            <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-2 opacity-60">Комісії та витрати</p>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className={labelClass}>Примітка</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Додаткова інформація..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#d6d5d0] dark:border-[#2a2a28] flex gap-3 bg-[#f5f5f0] dark:bg-[#141412] rounded-b-sm shrink-0">
        {initialData && onDelete && (
          <>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Видалити запис"
              className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#e8e8e4] dark:bg-[#2a2a28] text-[#c03030] dark:text-[#f08080] hover:bg-[#d6d5d0] dark:hover:bg-[#3a3a38] border border-[#d6d5d0] dark:border-[#3a3a38] rounded-sm transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <ConfirmDialog
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              onConfirm={() => onDelete(initialData.id)}
              title="Видалити запис?"
              message="Цю дію не можна скасувати. Запис буде видалено назавжди."
              confirmLabel="Видалити"
            />
          </>
        )}
        <button
          type="submit"
          className="flex-1 bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] font-bold py-3.5 rounded-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} />
          Зберегти
        </button>
      </div>
    </form>
  );
};
