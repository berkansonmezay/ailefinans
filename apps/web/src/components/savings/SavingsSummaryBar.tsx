import React from 'react';
import { Card } from '../ui/Card';
import { Wallet, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SavingsSummaryBarProps {
  assets: any[];
  marketRates: any[];
}

export function SavingsSummaryBar({ assets, marketRates }: SavingsSummaryBarProps) {
  let totalInvestment = 0;
  let totalCurrentValue = 0;

  assets.forEach(asset => {
    totalInvestment += asset.quantity * asset.averageCost;
    
    const rate = marketRates.find(r => r.code === asset.code);
    const currentPrice = rate ? rate.buying : asset.averageCost; // we use buying price for our asset value (if we sell it)
    totalCurrentValue += asset.quantity * currentPrice;
  });

  const totalProfitLoss = totalCurrentValue - totalInvestment;
  const profitLossPercentage = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4 bg-bg-card border-border flex flex-col justify-center">
        <div className="flex items-center gap-3 text-text-secondary mb-1">
          <Wallet className="w-4 h-4" />
          <h3 className="text-sm font-medium">Toplam Yatırım (Maliyet)</h3>
        </div>
        <p className="text-xl font-bold text-text-primary">
          {formatCurrency(totalInvestment)}
        </p>
      </Card>
      
      <Card className="p-4 bg-bg-card border-border flex flex-col justify-center">
        <div className="flex items-center gap-3 text-text-secondary mb-1">
          <RefreshCcw className="w-4 h-4" />
          <h3 className="text-sm font-medium">Güncel Varlık Değeri</h3>
        </div>
        <p className="text-xl font-bold text-text-primary">
          {formatCurrency(totalCurrentValue)}
        </p>
      </Card>

      <Card className="p-4 bg-bg-card border-border flex flex-col justify-center md:col-span-2">
        <div className="flex items-center gap-3 text-text-secondary mb-1">
          {totalProfitLoss >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
          <h3 className="text-sm font-medium">Toplam Kar/Zarar</h3>
        </div>
        <div className="flex items-baseline gap-3">
          <p className={`text-xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
          </p>
          <span className={`text-sm font-medium ${totalProfitLoss >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
          </span>
        </div>
      </Card>
    </div>
  );
}
