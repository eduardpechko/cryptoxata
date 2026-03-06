import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, noPadding = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Escape key, body scroll lock, focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before opening
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: cycle Tab within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus the first focusable element inside modal
    requestAnimationFrame(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    });

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-[#0d0d0b]/40 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="relative w-full sm:max-w-lg bg-[#f5f5f0] dark:bg-[#141412] rounded-t-sm sm:rounded-sm ring-1 ring-[#d6d5d0] dark:ring-[#2a2a28] transform transition-all animate-slide-in-bottom sm:animate-scale-in flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
          <div className="w-10 h-1 bg-[#d6d5d0] dark:bg-[#3a3a38] rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-[#d6d5d0] dark:border-[#2a2a28] shrink-0">
          <h3 id={titleId} className="font-black text-lg tracking-tight text-[#0d0d0b] dark:text-[#f0efec]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#71716b] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] p-2.5 rounded-sm hover:bg-[#e8e8e4] dark:hover:bg-[#2a2a28] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>
        {/* Content */}
        <div className={noPadding ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'p-6 sm:p-8 overflow-y-auto'}>
          {children}
        </div>
      </div>
    </div>
  );
};
