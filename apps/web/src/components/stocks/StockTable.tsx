'use client';

import React from 'react';
import { History, ArrowRightLeft, TrendingUp, TrendingDown, Edit2, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function StockTable({ 
  stocks, 
  loading, 
  onBuy, 
  onSell, 
  onHistory,
  onEdit,
  onDelete
}: StockTableProps) {
  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-12 text-center text-text-muted">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
        Hisse portföyü yükleniyor...
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4 text-text-muted">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Henüz Hisse Senediniz Yok</h3>
        <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">
          Portföyünüze Borsa İstanbul'dan hisse senedi ekleyerek yatırımlarınızı takip etmeye başlayın.
        </p>
        <Button onClick={() => onBuy()} className="shadow-sm">
          İlk Hissenizi Ekleyin
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-bg-sidebar border-b border-border text-text-secondary">
              <th className="px-5 py-3 font-semibold">Hisse Senedi</th>
              <th className="px-5 py-3 font-semibold text-right">Miktar (Lot)</th>
              <th className="px-5 py-3 font-semibold text-right">Ort. Maliyet</th>
              <th className="px-5 py-3 font-semibold text-right">Güncel Fiyat</th>
              <th className="px-5 py-3 font-semibold text-right">Kâr / Zarar</th>
              <th className="px-5 py-3 font-semibold text-right">Toplam Değer</th>
              <th className="px-5 py-3 font-semibold text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stocks.map((stock) => {
              const cleanSymbol = stock.symbol.replace('.IS', '');
              const isPositive = stock.pnlAmount >= 0;
              const dailyChangePositive = (stock.regularMarketChangePercent || 0) >= 0;
              
              return (
                <tr key={stock.id} className="hover:bg-bg-sidebar/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20">
                        {cleanSymbol.substring(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-primary text-sm">{cleanSymbol}</span>
                          {stock.regularMarketChangePercent !== undefined && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              dailyChangePositive 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                              {dailyChangePositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                              %{Math.abs(stock.regularMarketChangePercent).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate max-w-[180px]" title={stock.name}>
                          {stock.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-text-primary">
                    {stock.quantity.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-text-secondary">
                    {formatCurrency(stock.averageCost)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-text-primary">
                    {formatCurrency(stock.currentPrice)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(stock.pnlAmount)}
                    </div>
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${
                      isPositive 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {isPositive ? '+' : ''}%{stock.pnlPercentage.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-text-primary text-base">
                    {formatCurrency(stock.totalValue)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => onBuy(cleanSymbol)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
                        title="Hisse Alış Ekle"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onSell(stock.symbol, stock.quantity)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors border border-amber-500/20"
                        title="Hisse Satış Yap"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>
                      <button 
                        onClick={() => onHistory(stock.symbol)}
                        className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-text-primary transition-colors border border-border"
                        title="İşlem Geçmişi"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(stock)}
                          className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors border border-border"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(stock.symbol)}
                          className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-rose-500 transition-colors border border-border"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
