import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, action, compact = false }) => {
  return (
    <div className={`bg-[#f5f5f0] dark:bg-[#141412] border border-[#d6d5d0] dark:border-[#2a2a28] rounded-sm corner-mark relative overflow-hidden transition-colors duration-200 ${className}`}>
      <div className={compact ? 'p-4' : 'p-6'}>
        {(title || action) && (
          <div className="flex justify-between items-start mb-6">
            <div>
              {title && <h3 className="font-black text-lg tracking-tight text-[#0d0d0b] dark:text-[#f0efec]">{title}</h3>}
              {subtitle && <p className="font-mono text-[11px] uppercase tracking-widest text-[#71716b] dark:text-[#8a8a82] mt-1">{subtitle}</p>}
            </div>
            {action && <div className="pl-2">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
