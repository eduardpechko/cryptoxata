import React, { useCallback, useSyncExternalStore } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// Module-level store — no Context needed
let toasts: ToastItem[] = [];
let listeners: Array<() => void> = [];

function emitChange() {
  listeners.forEach(l => l());
}

const toastStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  getSnapshot() {
    return toasts;
  },
};

function addToast(message: string, type: ToastType, duration: number) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, type }];
  emitChange();
  setTimeout(() => {
    dismissToast(id);
  }, duration);
}

function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  emitChange();
}

// Public API — import { toast } from './ui/Toast' anywhere
export const toast = {
  show(message: string, type: ToastType = 'info', duration = 3000) {
    addToast(message, type, duration);
  },
  success(message: string) {
    addToast(message, 'success', 3000);
  },
  error(message: string) {
    addToast(message, 'error', 5000);
  },
  info(message: string) {
    addToast(message, 'info', 3000);
  },
};

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={14} />,
  error: <AlertCircle size={14} />,
  info: <Info size={14} />,
};

const accentColors: Record<ToastType, string> = {
  success: 'border-l-[#5dde4a]',
  error: 'border-l-[#c03030]',
  info: 'border-l-[#71716b]',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-[#5dde4a]',
  error: 'text-[#f08080]',
  info: 'text-[#8a8a82]',
};

export const ToastContainer: React.FC = () => {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);

  const handleDismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 right-4 left-4 lg:left-auto z-[60] flex flex-col gap-2 lg:w-80"
      role="region"
      aria-label="Сповіщення"
      aria-live="polite"
    >
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-center gap-3 px-4 py-3 bg-[#0d0d0b] dark:bg-[#f0efec] rounded-sm border-l-2 ${accentColors[item.type]} animate-slide-in-bottom`}
        >
          <span className={`shrink-0 ${iconColors[item.type]}`}>
            {icons[item.type]}
          </span>
          <p className="font-mono text-xs uppercase tracking-widest text-[#f0efec] dark:text-[#0d0d0b] flex-1 leading-relaxed">
            {item.message}
          </p>
          <button
            onClick={() => handleDismiss(item.id)}
            className="shrink-0 text-[#71716b] hover:text-[#f0efec] dark:hover:text-[#0d0d0b] transition-colors p-1"
            aria-label="Закрити сповіщення"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
