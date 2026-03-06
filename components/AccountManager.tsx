import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Wallet, Shield, Save, AlertCircle } from 'lucide-react';
import { Account, User } from '../types';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  users: User[];
  initialUserId?: User;
  initialView?: 'list' | 'form';
  onAddAccount: (account: Omit<Account, 'id' | 'deleted' | 'updatedAt'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  isOpen,
  onClose,
  accounts,
  users,
  initialUserId,
  initialView = 'list',
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
}) => {
  const [view, setView] = useState<'list' | 'form'>(initialView);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

  const [name, setName] = useState('');
  const [userId, setUserId] = useState<User>(initialUserId || users[0]);
  const [proxy, setProxy] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      if (initialUserId) setUserId(initialUserId);
    }
  }, [isOpen, initialView, initialUserId]);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setUserId(editingAccount.userId);
      setProxy(editingAccount.proxy || '');
      setWalletAddress(editingAccount.walletAddress || '');
      setColor(editingAccount.color || '#6366f1');
      setView('form');
    } else {
      resetForm();
    }
  }, [editingAccount]);

  const resetForm = () => {
    setName('');
    setUserId(initialUserId || users[0]);
    setProxy('');
    setWalletAddress('');
    setColor('#6366f1');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Введіть назву акаунту');
      return;
    }
    setNameError('');
    const accountData = { name, userId, proxy, walletAddress, color };
    if (editingAccount) {
      onUpdateAccount({ ...editingAccount, ...accountData });
    } else {
      onAddAccount(accountData);
    }
    if (initialUserId) {
      onClose();
    } else {
      setView('list');
    }
    setEditingAccount(null);
    resetForm();
  };

  const handleEdit = (account: Account) => { setEditingAccount(account); };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const inputClass = "w-full bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm px-3.5 py-2.5 text-sm font-sans text-[#0d0d0b] dark:text-[#f0efec] focus:border-[#5dde4a] focus:ring-2 focus:ring-[#5dde4a]/20 focus:outline-none transition-colors placeholder-[#71716b] dark:placeholder-[#8a8a82]";
  const labelClass = "block font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mb-2";

  const colorPalette = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#5dde4a'];

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Управління Акаунтами">
      <div className="space-y-5">
        {view === 'list' ? (
          <>
            <div className="flex justify-between items-center">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">
                [ {accounts.filter(a => !a.deleted).length} акаунт(ів) ]
              </p>
              <button
                onClick={() => { setEditingAccount(null); setView('form'); }}
                className="flex items-center gap-1.5 bg-[#5dde4a] hover:bg-[#4cc43a] text-[#0d0d0b] font-semibold px-4 py-1.5 rounded-sm text-sm active:scale-[0.99] transition-all"
              >
                <Plus size={14} strokeWidth={2.5} />
                Додати
              </button>
            </div>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {users.map(user => {
                const userAccounts = accounts.filter(a => a.userId === user && !a.deleted);
                if (userAccounts.length === 0) return null;

                return (
                  <div key={user} className="space-y-2">
                    <h3 className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] px-1">{user}</h3>
                    <div className="space-y-2">
                      {userAccounts.map(account => (
                        <div
                          key={account.id}
                          className="group relative bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm p-4 hover:border-[#a0a09a] dark:hover:border-[#3a3a38] transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-sm flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: account.color || '#6366f1' }}
                              >
                                <Wallet size={16} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-[#0d0d0b] dark:text-[#f0efec]">{account.name}</h4>
                                {account.walletAddress && (
                                  <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-0.5 truncate max-w-[150px]">
                                    {account.walletAddress.slice(0, 6)}...{account.walletAddress.slice(-4)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEdit(account)}
                                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#71716b] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] rounded-sm transition-colors"
                                aria-label={`Редагувати ${account.name}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(account.id)}
                                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#71716b] hover:text-[#c03030] hover:bg-[#c03030]/5 dark:hover:bg-[#c03030]/10 rounded-sm transition-colors"
                                aria-label={`Видалити ${account.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {account.proxy && (
                            <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] bg-[#e8e8e4] dark:bg-[#1a1a18] px-3 py-1.5 border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm">
                              <Shield size={11} className="text-[#15700a] dark:text-[#5dde4a] shrink-0" />
                              <span className="truncate">{account.proxy}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {accounts.filter(a => !a.deleted).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="w-12 h-12 bg-[#e8e8e4] dark:bg-[#2a2a28] rounded-sm flex items-center justify-center">
                    <Wallet size={20} className="text-[#71716b] dark:text-[#8a8a82]" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82]">[ Немає акаунтів ]</p>
                    <p className="text-xs text-[#71716b] dark:text-[#8a8a82] mt-2 max-w-[200px] leading-relaxed">
                      Додайте перший акаунт для зручного групування транзакцій
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingAccount(null); setView('form'); }}
                    className="mt-2 flex items-center gap-1.5 bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] font-semibold px-4 py-2.5 rounded-sm text-sm hover:opacity-90 active:scale-[0.99] transition-all"
                  >
                    <Plus size={14} strokeWidth={2.5} /> Додати акаунт
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#0d0d0b] dark:text-[#f0efec] tracking-tight">
                {editingAccount ? 'Редагувати акаунт' : 'Новий акаунт'}
              </h3>
              <button
                type="button"
                onClick={() => { setView('list'); setEditingAccount(null); }}
                className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] transition-colors"
              >
                [ Назад ]
              </button>
            </div>

            {/* Owner */}
            <div>
              <label className={labelClass}>Власник</label>
              <div className="grid grid-cols-3 gap-2">
                {users.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUserId(u)}
                    className={`py-2 text-sm font-semibold transition-colors border rounded-sm ${
                      userId === u
                        ? 'bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] border-[#0d0d0b] dark:border-[#f0efec]'
                        : 'bg-transparent text-[#71716b] dark:text-[#8a8a82] border-[#d6d5d0] dark:border-[#2a2a28] hover:border-[#a0a09a] dark:hover:border-[#3a3a38]'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>Назва акаунту</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Напр. Main Wallet, Airdrop 1..."
                className={inputClass}
                required
              />
              {nameError && (
                <p className="font-mono text-[11px] text-[#c03030] dark:text-[#f08080] mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {nameError}
                </p>
              )}
            </div>

            {/* Wallet */}
            <div>
              <label className={labelClass}>Адреса гаманця (опціонально)</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className={`${inputClass} font-mono text-xs`}
              />
              <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-1 opacity-60">Ethereum або EVM-сумісна адреса</p>
            </div>

            {/* Proxy */}
            <div>
              <label className={labelClass}>Proxy (опціонально)</label>
              <input
                type="text"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="ip:port:user:pass"
                className={`${inputClass} font-mono text-xs`}
              />
              <p className="font-mono text-[11px] text-[#71716b] dark:text-[#8a8a82] mt-1 opacity-60">Формат: ip:port:user:pass</p>
            </div>

            {/* Color */}
            <div>
              <label className={labelClass}>Колір мітки</label>
              <div className="flex gap-2.5 flex-wrap py-1">
                {colorPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-sm transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-[#0d0d0b] dark:ring-[#f0efec] scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => { setView('list'); setEditingAccount(null); }}
                className="flex-1 px-4 py-3 bg-[#e8e8e4] dark:bg-[#2a2a28] hover:bg-[#d6d5d0] dark:hover:bg-[#3a3a38] text-[#0d0d0b] dark:text-[#f0efec] rounded-sm text-sm font-semibold transition-colors"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#0d0d0b] dark:bg-[#f0efec] text-[#f0efec] dark:text-[#0d0d0b] font-bold py-3 rounded-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {editingAccount ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
    <ConfirmDialog
      isOpen={deleteTarget !== null}
      onClose={() => setDeleteTarget(null)}
      onConfirm={() => { if (deleteTarget) { onDeleteAccount(deleteTarget); setDeleteTarget(null); } }}
      title="Видалити акаунт?"
      message="Акаунт буде видалено. Транзакції, прив'язані до нього, збережуться."
      confirmLabel="Видалити"
    />
    </>
  );
};
