import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Видалити',
  variant = 'danger',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center ${
            variant === 'danger'
              ? 'bg-[#c03030]/10 text-[#c03030] dark:bg-[#f08080]/10 dark:text-[#f08080]'
              : 'bg-[#d4a017]/10 text-[#d4a017] dark:bg-[#f0c040]/10 dark:text-[#f0c040]'
          }`}>
            <AlertTriangle size={18} />
          </div>
          <p className="text-sm text-[#0d0d0b] dark:text-[#f0efec] leading-relaxed pt-2">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] rounded-sm transition-colors min-h-[44px]"
          >
            Скасувати
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2.5 text-sm font-semibold rounded-sm transition-colors min-h-[44px] ${
              variant === 'danger'
                ? 'bg-[#c03030] hover:bg-[#a02828] text-white'
                : 'bg-[#d4a017] hover:bg-[#b8900f] text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
