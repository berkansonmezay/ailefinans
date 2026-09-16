'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft } from 'lucide-react';

interface CryptoSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

interface CryptoSummaryBarProps {
  summary: CryptoSummary | null;
  loading: boolean;
}

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function CryptoSummaryBar({ summary, loading }: CryptoSummaryBarProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-bg-secondary rounded w-1/2 mb-2" />
            <div className="h-6 bg-bg-secondary rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const isPositive = summary.totalPnL >= 0;

  const cards = [
    {
      label: 'Toplam Portföy Değeri',
      value: formatCurrency(summary.totalValue),
      icon: Wallet,
      iconColor: '#3b82f6',
      iconBg: '#3b82f615',
    },
    {
      label: 'Toplam Maliyet (Yatırım)',
      value: formatCurrency(summary.totalCost),
      icon: ArrowRightLeft,
      iconColor: '#64748b',
      iconBg: '#64748b15',
    },
    {
      label: 'Toplam Kâr / Zarar',
      value: formatCurrency(summary.totalPnL),
      sublabel: `${isPositive ? '+' : ''}${summary.totalPnLPercentage.toFixed(2)}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      iconColor: isPositive ? '#10b981' : '#f43f5e',
      iconBg: isPositive ? '#10b98115' : '#f43f5e15',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-bg-card border border-border rounded-2xl p-3 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-muted">{card.label}</span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end gap-3">
               <p className="text-xl font-bold text-text-primary">{card.value}</p>
               {card.sublabel && (
                 <span className="text-sm font-semibold mb-1" style={{ color: card.iconColor }}>
                   {card.sublabel}
                 </span>
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
