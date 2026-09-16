import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Repeat, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface SubscriptionSummaryBarProps {
  subscriptions: any[];
}

export function SubscriptionSummaryBar({ subscriptions }: SubscriptionSummaryBarProps) {
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');

  // Calculate normalized monthly cost
  const totalMonthlyCost = activeSubs.reduce((acc, sub) => {
    let cost = Number(sub.amount) || 0;
    if (sub.frequency === 'YEARLY') cost = cost / 12;
    if (sub.frequency === 'WEEKLY') cost = cost * 4.33;
    return acc + cost;
  }, 0);

  const totalYearlyCost = totalMonthlyCost * 12;

  // Upcoming in next 7 days
  const upcomingCount = activeSubs.filter(sub => {
    if (!sub.nextPaymentDate) return false;
    const days = differenceInDays(new Date(sub.nextPaymentDate), new Date());
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. AYLIK TOPLAM GİDER (Mavi) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <Repeat className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            AYLIK TOPLAM GİDER
          </span>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-tight truncate">
            {formatCurrency(totalMonthlyCost)}
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            Aylık normalize edilmiş bütçe
          </div>
        </div>
      </div>

      {/* 2. YILLIK PROJEKSİYON (Mor) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            YILLIK PROJEKSİYON
          </span>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight leading-tight truncate">
            {formatCurrency(totalYearlyCost)}
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            12 aylık tahmini toplam
          </div>
        </div>
      </div>

      {/* 3. AKTİF ABONELİKLER (Zümrüt) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            AKTİF ABONELİKLER
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight truncate">
            {activeSubs.length} Adet
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            Düzenli yenilenen hizmet
          </div>
        </div>
      </div>

      {/* 4. YAKLAŞAN ÖDEMELER (Amber) */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
          <Clock className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
            YAKLAŞAN VADE (7 GÜN)
          </span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-500 tracking-tight leading-tight truncate">
            {upcomingCount} Ödeme
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
            Bu hafta tahsil edilecek
          </div>
        </div>
      </div>
    </div>
  );
}
