'use client';

import React from 'react';
import { History, ArrowRightLeft, TrendingUp, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

export interface StockItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  pnlAmount: number;
  pnlPercentage: number;
  regularMarketChangePercent?: number;
}

interface StockTableProps {
  stocks: StockItem[];
  loading: boolean;
  onBuy: (symbol?: string) => void;
  onSell: (symbol: string, maxQuantity: number) => void;
  onHistory: (symbol: string) => void;
  onEdit?: (stock: StockItem) => void;
  onDelete?: (symbol: string) => void;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(val);
}

export function StockTable({ stocks, loading, onBuy, onSell, onHistory }: StockTableProps) {
  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 text-center text-text-muted animate-pulse">
          Portföy yükleniyor...
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden text-center py-12 px-4">
        <div className="w-16 h-16 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Henüz Hisse Senediniz Yok</h3>
        <p className="text-text-muted mb-6 max-w-sm mx-auto">
          Portföyünüze Borsa İstanbul'dan hisse senedi ekleyerek yatırımlarınızı takip etmeye başlayın.
        </p>
        <Button onClick={() => onBuy()}>İlk Hissenizi Ekleyin</Button>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-bg-secondary/30">
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider">Hisse</th>
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Miktar (Lot)</th>
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ort. Maliyet</th>
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Güncel Fiyat</th>
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Kâr/Zarar</th>
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Toplam Değer</th>
              <th className="py-2.5 px-5 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stocks.map((stock) => {
              const cleanSymbol = stock.symbol.replace('.IS', '');
              const isPositive = stock.pnlAmount >= 0;
              const dailyChangePositive = (stock.regularMarketChangePercent || 0) >= 0;
              
              return (
                <tr key={stock.id} className="hover:bg-bg-card-hover transition-colors group">
                  <td className="py-2 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-bg-secondary flex items-center justify-center font-bold text-text-primary shrink-0 text-sm">
                        {cleanSymbol.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary flex items-center gap-2">
                          {cleanSymbol}
                          {stock.regularMarketChangePercent !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${dailyChangePositive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                              {dailyChangePositive ? '+' : ''}{stock.regularMarketChangePercent.toFixed(2)}%
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted truncate max-w-[150px]" title={stock.name}>{stock.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-5 text-right font-medium text-text-primary">
                    {stock.quantity}
                  </td>
                  <td className="py-2 px-5 text-right font-medium text-text-primary">
                    {formatCurrency(stock.averageCost)}
                  </td>
                  <td className="py-2 px-5 text-right font-bold text-text-primary">
                    {formatCurrency(stock.currentPrice)}
                  </td>
                  <td className="py-2 px-5 text-right">
                    <p className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(stock.pnlAmount)}
                    </p>
                    <p className={`text-xs font-semibold ${isPositive ? 'text-success' : 'text-danger'} opacity-80`}>
                      {isPositive ? '+' : ''}{stock.pnlPercentage.toFixed(2)}%
                    </p>
                  </td>
                  <td className="py-2 px-5 text-right font-bold text-text-primary">
                    {formatCurrency(stock.totalValue)}
                  </td>
                  <td className="py-2 px-5">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onBuy(cleanSymbol)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                        title="Alış Ekle"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onSell(stock.symbol, stock.quantity)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                        title="Satış Yap"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onHistory(stock.symbol)}
                        className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                        title="İşlem Geçmişi"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onEdit?.(stock)}
                        className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete?.(stock.symbol)}
                        className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-rose-500 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
