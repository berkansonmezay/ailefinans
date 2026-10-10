'use client';

import React from 'react';
import { CreditCard, TrendingDown, TrendingUp, AlertTriangle, BellRing } from 'lucide-react';

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
  isFitMode?: boolean;
}

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function CalendarSummaryBar({ summary, loading, isFitMode = false }: CalendarSummaryBarProps) {
  if (loading || !summary) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${isFitMode ? 'gap-2.5' : 'gap-4'}`}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`bg-bg-card border border-border rounded-2xl animate-pulse flex items-center ${isFitMode ? 'p-2.5 gap-2.5' : 'p-4 gap-3.5'}`}>
            <div className={`${isFitMode ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-xl'} bg-bg-secondary`} />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-bg-secondary rounded w-1/2" />
              <div className="h-5 bg-bg-secondary rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${isFitMode ? 'gap-2.5' : 'gap-4'}`}>
      {/* 1. Borç Taksitleri - Blue */}
      <div className={`bg-bg-card border border-border rounded-2xl flex items-center shadow-sm border-l-[5px] border-l-blue-600 transition-all hover:shadow-md ${isFitMode ? 'p-2.5 gap-2.5' : 'p-4 gap-3.5'}`}>
        <div className={`rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0 ${isFitMode ? 'p-2 rounded-lg' : 'p-3'}`}>
          <TrendingDown className={isFitMode ? 'w-4 h-4' : 'w-6 h-6'} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${isFitMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-text-muted uppercase tracking-wider truncate`}>
            Borç Taksitleri
          </p>
          <p className={`${isFitMode ? 'text-lg mt-0' : 'text-xl sm:text-2xl mt-0.5'} font-black text-text-primary tracking-tight font-mono truncate`}>
            {formatCurrency(summary.totalDebtAmount)}
          </p>
          <p className={`${isFitMode ? 'text-[10px] mt-0' : 'text-xs mt-0.5'} text-text-muted font-medium`}>
            {summary.debtInstallmentCount} taksit planlandı
          </p>
        </div>
      </div>

      {/* 2. Beklenen Alacak - Emerald */}
      <div className={`bg-bg-card border border-border rounded-2xl flex items-center shadow-sm border-l-[5px] border-l-emerald-500 transition-all hover:shadow-md ${isFitMode ? 'p-2.5 gap-2.5' : 'p-4 gap-3.5'}`}>
        <div className={`rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0 ${isFitMode ? 'p-2 rounded-lg' : 'p-3'}`}>
          <TrendingUp className={isFitMode ? 'w-4 h-4' : 'w-6 h-6'} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${isFitMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-text-muted uppercase tracking-wider truncate`}>
            Beklenen Alacak
          </p>
          <p className={`${isFitMode ? 'text-lg mt-0' : 'text-xl sm:text-2xl mt-0.5'} font-black text-text-primary tracking-tight font-mono truncate`}>
            {formatCurrency(summary.totalReceivableAmount)}
          </p>
          <p className={`${isFitMode ? 'text-[10px] mt-0' : 'text-xs mt-0.5'} text-text-muted font-medium`}>
            {summary.receivableInstallmentCount} alacak taksiti
          </p>
        </div>
      </div>

      {/* 3. Vadesi Geçmiş - Rose */}
      <div className={`bg-bg-card border border-border rounded-2xl flex items-center shadow-sm border-l-[5px] border-l-rose-500 transition-all hover:shadow-md ${isFitMode ? 'p-2.5 gap-2.5' : 'p-4 gap-3.5'}`}>
        <div className={`rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 shrink-0 ${isFitMode ? 'p-2 rounded-lg' : 'p-3'}`}>
          <AlertTriangle className={isFitMode ? 'w-4 h-4' : 'w-6 h-6'} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${isFitMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-text-muted uppercase tracking-wider truncate`}>
            Vadesi Geçmiş / Bugün
          </p>
          <p className={`${isFitMode ? 'text-lg mt-0' : 'text-xl sm:text-2xl mt-0.5'} font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono truncate`}>
            {summary.overdueCount} <span className="text-xs font-normal text-text-muted">kalem</span>
          </p>
          <p className={`${isFitMode ? 'text-[10px] mt-0' : 'text-xs mt-0.5'} text-text-muted font-medium`}>
            {summary.dueTodayCount > 0 ? `+ ${summary.dueTodayCount} bugün vadeli` : 'Kritik gecikme yok'}
          </p>
        </div>
      </div>

      {/* 4. Hatırlatmalar - Purple */}
      <div className={`bg-bg-card border border-border rounded-2xl flex items-center shadow-sm border-l-[5px] border-l-purple-500 transition-all hover:shadow-md ${isFitMode ? 'p-2.5 gap-2.5' : 'p-4 gap-3.5'}`}>
        <div className={`rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 shrink-0 ${isFitMode ? 'p-2 rounded-lg' : 'p-3'}`}>
          <BellRing className={isFitMode ? 'w-4 h-4' : 'w-6 h-6'} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${isFitMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-text-muted uppercase tracking-wider truncate`}>
            Aktif Hatırlatmalar
          </p>
          <p className={`${isFitMode ? 'text-lg mt-0' : 'text-xl sm:text-2xl mt-0.5'} font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono truncate`}>
            {summary.activeReminderCount} <span className="text-xs font-normal text-text-muted">adet</span>
          </p>
          <p className={`${isFitMode ? 'text-[10px] mt-0' : 'text-xs mt-0.5'} text-text-muted font-medium`}>
            Zamanlanmış bildirim
          </p>
        </div>
      </div>
    </div>
  );
}
