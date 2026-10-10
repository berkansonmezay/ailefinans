'use client';

import React from 'react';
import { CreditCard, ArrowDownCircle, BellRing } from 'lucide-react';

interface CalendarLegendProps {
  filters: {
    debts: boolean;
    receivables: boolean;
    reminders: boolean;
  };
  onFilterChange: (filters: { debts: boolean; receivables: boolean; reminders: boolean }) => void;
  counts: {
    debts: number;
    receivables: number;
    reminders: number;
  };
  isFitMode?: boolean;
}

const LEGEND_ITEMS = [
  {
    key: 'debts' as const,
    label: 'Borç Taksitleri',
    icon: CreditCard,
    colors: [
      { color: '#3b82f6', label: 'Planlı' },
      { color: '#f59e0b', label: 'Bugün' },
      { color: '#f43f5e', label: 'Gecikmiş' },
      { color: '#64748b', label: 'Ödendi' },
    ],
  },
  {
    key: 'receivables' as const,
    label: 'Alacak Taksitleri',
    icon: ArrowDownCircle,
    colors: [
      { color: '#10b981', label: 'Beklenen' },
      { color: '#f59e0b', label: 'Gecikmiş' },
      { color: '#64748b', label: 'Tahsil' },
    ],
  },
  {
    key: 'reminders' as const,
    label: 'Hatırlatmalar',
    icon: BellRing,
    colors: [
      { color: '#8b5cf6', label: 'Aktif' },
      { color: '#f59e0b', label: 'Bugün' },
      { color: '#f43f5e', label: 'Gecikmiş' },
    ],
  },
];

export function CalendarLegend({ filters, onFilterChange, counts, isFitMode = false }: CalendarLegendProps) {
  const toggleFilter = (key: keyof typeof filters) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className={`flex flex-wrap ${isFitMode ? 'gap-1.5' : 'gap-2'}`}>
      {LEGEND_ITEMS.map(item => {
        const isActive = filters[item.key];
        const count = counts[item.key];
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            onClick={() => toggleFilter(item.key)}
            className={`
              flex items-center gap-1.5 rounded-xl border font-medium
              transition-all duration-200
              ${isFitMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}
              ${isActive
                ? 'border-border bg-bg-card text-text-primary shadow-sm'
                : 'border-transparent bg-bg-secondary/50 text-text-muted opacity-60 hover:opacity-80'
              }
            `}
          >
            <Icon className={isFitMode ? 'w-3.5 h-3.5' : 'w-4 h-4'} style={{ color: item.colors[0].color }} />
            <span>{item.label}</span>
            {count > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: isActive ? item.colors[0].color + '20' : '#64748b20',
                  color: isActive ? item.colors[0].color : '#64748b',
                }}
              >
                {count}
              </span>
            )}
            {/* Color dots legend */}
            <div className="flex items-center gap-1 ml-1">
              {item.colors.map((c, idx) => (
                <span
                  key={idx}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: isActive ? c.color : '#64748b50' }}
                  title={c.label}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
