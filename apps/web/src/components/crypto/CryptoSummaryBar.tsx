'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Bitcoin, PieChart } from 'lucide-react';

interface CryptoSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercentage: number;
}

interface CryptoSummaryBarProps {
  summary: CryptoSummary | null;
  loading: boolean;
  cryptoCount?: number;
}

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function CryptoSummaryBar({ summary, loading, cryptoCount = 0 }: CryptoSummaryBarProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 animate-pulse flex items-center gap-3.5 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-bg-secondary flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-bg-secondary rounded w-1/2 mb-2" />
              <div className="h-6 bg-bg-secondary rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isPositive = summary.totalPnL >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. TOPLAM PORTFÖY DEĞERİ (Mavi) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            KRİPTO PORTFÖY DEĞERİ
          </span>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-tight truncate">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            {cryptoCount > 0 ? `${cryptoCount} kripto varlık` : 'Portföy aktif'}
          </div>
        </div>
      </div>

      {/* 2. TOPLAM MALİYET (Amber) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
          <Bitcoin className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            TOPLAM YATIRIM (MALİYET)
          </span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-tight truncate">
            {formatCurrency(summary.totalCost)}
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            Alış maliyetleri toplamı
          </div>
        </div>
      </div>

      {/* 3. TOPLAM KÂR / ZARAR (Zümrüt veya Gül) */}
      <div className={`bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] ${isPositive ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
        }`}>
          {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            TOPLAM KÂR / ZARAR
          </span>
          <div className={`text-xl font-black tracking-tight leading-tight truncate ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{formatCurrency(summary.totalPnL)}
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            Net gerçekleşmemiş getiri
          </div>
        </div>
      </div>

      {/* 4. PERFORMANS (Mor) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
          <PieChart className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            GETİRİ PERFORMANSI
          </span>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight leading-tight">
            {isPositive ? '+' : ''}%{summary.totalPnLPercentage.toFixed(2)}
          </div>
          <div className={`text-xs font-semibold mt-0.5 flex items-center gap-0.5 ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            <span>{isPositive ? '↑ Net Kâr Oranı' : '↓ Net Zarar Oranı'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
