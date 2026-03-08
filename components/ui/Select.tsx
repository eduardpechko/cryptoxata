import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  prefix?: React.ReactNode; // e.g. avatar, color dot, icon
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string; // override trigger button classes
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Оберіть...',
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const triggerClass = className ??
    "w-full bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm px-3.5 py-2.5 text-sm font-sans text-[#0d0d0b] dark:text-[#f0efec] focus:border-[#5dde4a] focus:ring-2 focus:ring-[#5dde4a]/20 focus:outline-none transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(o => !o)}
        className={`${triggerClass} flex items-center justify-between gap-2 pr-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.prefix && <span className="shrink-0">{selected.prefix}</span>}
          <span className={`truncate ${!selected ? 'text-[#71716b] dark:text-[#8a8a82]' : ''}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[#71716b] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-[#f5f5f0] dark:bg-[#141412] rounded-sm border border-[#d6d5d0] dark:border-[#2a2a28] p-1 animate-scale-in origin-top z-50 shadow-sm"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-sm transition-colors text-[#71716b] dark:text-[#8a8a82] hover:text-[#0d0d0b] dark:hover:text-[#f0efec] hover:bg-[#f0efec] dark:hover:bg-[#1a1a18]"
            >
              <span className="flex items-center gap-2 min-w-0">
                {opt.prefix && <span className="shrink-0">{opt.prefix}</span>}
                <span className="truncate">{opt.label}</span>
              </span>
              {opt.value === value && <Check size={13} className="shrink-0 text-[#5dde4a]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
