'use client';

import React from 'react';
import { CreditCard, ArrowDownCircle, AlertTriangle, BellRing, TrendingDown, TrendingUp } from 'lucide-react';

interface CalendarSummary {
  totalDebtAmount: number;
  totalReceivableAmount: number;
  overdueCount: number;
  dueTodayCount: number;
  activeReminderCount: number;
  debtInstallmentCount: number;
  receivableInstallmentCount: number;
}

interface CalendarSummaryBarProps {
  summary: CalendarSummary | null;
  loading: boolean;
}

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function CalendarSummaryBar({ summary, loading }: CalendarSummaryBarProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-bg-secondary rounded w-2/3 mb-2" />
            <div className="h-6 bg-bg-secondary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Borç Taksitleri',
      value: formatCurrency(summary.totalDebtAmount),
      sublabel: `${summary.debtInstallmentCount} taksit`,
      icon: TrendingDown,
      iconColor: '#3b82f6',
      iconBg: '#3b82f615',
    },
    {
      label: 'Beklenen Alacak',
      value: formatCurrency(summary.totalReceivableAmount),
      sublabel: `${summary.receivableInstallmentCount} taksit`,
      icon: TrendingUp,
      iconColor: '#10b981',
      iconBg: '#10b98115',
    },
    {
      label: 'Vadesi Geçmiş',
      value: String(summary.overdueCount),
      sublabel: summary.dueTodayCount > 0 ? `+ ${summary.dueTodayCount} bugün vadeli` : 'Gecikmiş kalem',
      icon: AlertTriangle,
      iconColor: summary.overdueCount > 0 ? '#f43f5e' : '#64748b',
      iconBg: summary.overdueCount > 0 ? '#f43f5e15' : '#64748b15',
    },
    {
      label: 'Hatırlatmalar',
      value: String(summary.activeReminderCount),
      sublabel: 'Aktif hatırlatma',
      icon: BellRing,
      iconColor: '#8b5cf6',
      iconBg: '#8b5cf615',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-bg-card border border-border rounded-2xl p-3 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-text-muted">{card.label}</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-bold text-text-primary">{card.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{card.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
