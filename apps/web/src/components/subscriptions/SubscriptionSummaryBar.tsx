import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Repeat, CalendarDays, Receipt } from 'lucide-react';

interface SubscriptionSummaryBarProps {
  subscriptions: any[];
}

export function SubscriptionSummaryBar({ subscriptions }: SubscriptionSummaryBarProps) {
  // Calculate normalized monthly cost
  const totalMonthlyCost = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((acc, sub) => {
      let cost = sub.amount;
      if (sub.frequency === 'YEARLY') cost = cost / 12;
      if (sub.frequency === 'WEEKLY') cost = cost * 4.33;
      return acc + cost;
    }, 0);

  const totalYearlyCost = totalMonthlyCost * 12;
  const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-bg-card border-border">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-muted mb-1">Aylık Toplam Maliyet</div>
            <div className="text-2xl font-bold text-text-primary">
              {formatCurrency(totalMonthlyCost)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-bg-card border-border">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-muted mb-1">Yıllık Toplam Maliyet</div>
            <div className="text-2xl font-bold text-text-primary">
              {formatCurrency(totalYearlyCost)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-bg-card border-border">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-muted mb-1">Aktif Abonelikler</div>
            <div className="text-2xl font-bold text-text-primary">
              {activeCount} Adet
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
