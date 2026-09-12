import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-card backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl relative ${className}`}>
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-3 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${className}`}>
      <div>
        <h3 className="text-xl font-bold text-text-primary tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-text-muted mt-1 font-medium">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = '', noPadding = false }: { children: React.ReactNode; className?: string; noPadding?: boolean }) {
  return (
    <div className={`${noPadding ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  );
}
