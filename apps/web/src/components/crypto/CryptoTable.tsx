'use client';

import React from 'react';
import { History, ArrowRightLeft, TrendingUp, TrendingDown, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Bitcoin } from 'lucide-react';
import { Button } from '../ui/Button';

export interface CryptoItem {
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

interface CryptoTableProps {
  cryptos: CryptoItem[];
  loading: boolean;
  onBuy: (symbol?: string) => void;
  onSell: (symbol: string, maxQuantity: number) => void;
  onHistory: (symbol: string) => void;
  onEdit?: (crypto: CryptoItem) => void;
  onDelete?: (symbol: string) => void;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function CryptoTable({ 
  cryptos, 
  loading, 
  onBuy, 
  onSell, 
  onHistory,
  onEdit,
  onDelete
}: CryptoTableProps) {
  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-12 text-center text-text-muted">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
        Kripto portföyü yükleniyor...
      </div>
    );
  }

  if (cryptos.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4 text-text-muted">
          <Bitcoin className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Henüz Kripto Varlığınız Yok</h3>
        <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">
          Portföyünüze Bitcoin, Ethereum veya diğer kripto paraları ekleyerek varlıklarınızı canlı takip edin.
        </p>
        <Button onClick={() => onBuy()} className="shadow-sm">
          İlk Kripto Varlığınızı Ekleyin
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
              <th className="px-5 py-3 font-semibold">Kripto Varlık</th>
              <th className="px-5 py-3 font-semibold text-right">Miktar (Adet)</th>
              <th className="px-5 py-3 font-semibold text-right">Ort. Maliyet</th>
              <th className="px-5 py-3 font-semibold text-right">Güncel Fiyat</th>
              <th className="px-5 py-3 font-semibold text-right">Kâr / Zarar</th>
              <th className="px-5 py-3 font-semibold text-right">Toplam Değer</th>
              <th className="px-5 py-3 font-semibold text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cryptos.map((crypto) => {
              const cleanSymbol = crypto.symbol.replace('-USD', '');
              const isPositive = crypto.pnlAmount >= 0;
              const dailyChangePositive = (crypto.regularMarketChangePercent || 0) >= 0;
              
              return (
                <tr key={crypto.id} className="hover:bg-bg-sidebar/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                        {cleanSymbol.substring(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-primary text-sm">{cleanSymbol}</span>
                          {crypto.regularMarketChangePercent !== undefined && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              dailyChangePositive 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                              {dailyChangePositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                              %{Math.abs(crypto.regularMarketChangePercent).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate max-w-[180px]" title={crypto.name}>
                          {crypto.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-text-primary">
                    {crypto.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 8 })}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-text-secondary">
                    {formatCurrency(crypto.averageCost)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-text-primary">
                    {formatCurrency(crypto.currentPrice)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(crypto.pnlAmount)}
                    </div>
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${
                      isPositive 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {isPositive ? '+' : ''}%{crypto.pnlPercentage.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-text-primary text-base">
                    {formatCurrency(crypto.totalValue)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => onBuy(cleanSymbol)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
                        title="Kripto Alış Ekle"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onSell(crypto.symbol, crypto.quantity)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors border border-amber-500/20"
                        title="Kripto Satış Yap"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>
                      <button 
                        onClick={() => onHistory(crypto.symbol)}
                        className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-text-primary transition-colors border border-border"
                        title="İşlem Geçmişi"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(crypto)}
                          className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors border border-border"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(crypto.symbol)}
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
