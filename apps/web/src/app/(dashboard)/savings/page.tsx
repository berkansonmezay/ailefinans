'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SavingsBuyModal } from '@/components/savings/SavingsBuyModal';
import { SavingsSellModal } from '@/components/savings/SavingsSellModal';
import { SavingsSummaryBar } from '@/components/savings/SavingsSummaryBar';
import { fetchApi } from '@/lib/api';
import { SavingsEditModal } from '@/components/savings/SavingsEditModal';
import { SavingsTransactionsModal } from '@/components/savings/SavingsTransactionsModal';
import { Plus, TrendingUp, TrendingDown, Coins, ArrowRightLeft, Edit, Trash2, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

export default function SavingsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [marketRates, setMarketRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  
  const [sellModalData, setSellModalData] = useState<{ isOpen: boolean; asset: any; currentRate: number }>({
    isOpen: false,
    asset: null,
    currentRate: 0
  });

  const [editModalData, setEditModalData] = useState<{ isOpen: boolean; asset: any }>({
    isOpen: false,
    asset: null,
  });

  const [txModalData, setTxModalData] = useState<{ isOpen: boolean; asset: any }>({
    isOpen: false,
    asset: null,
  });

  const [buyModalAsset, setBuyModalAsset] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetsData, ratesData] = await Promise.all([
        fetchApi('/savings-assets'),
        fetchApi('/market/rates')
      ]);
      setAssets(assetsData);
      setMarketRates(ratesData?.rates || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMarketRate = (code: string) => {
    const rate = marketRates.find(r => r.code === code);
    return rate ? rate.buying : null;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu varlığı tamamen silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await fetchApi(`/savings-assets/${id}`, {
        method: 'DELETE',
      });
      toast.success('Varlık başarıyla silindi');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Varlık silinirken hata oluştu');
    }
  };

  if (loading) return <div className="text-text-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-text-muted" />
            Altın & Döviz
          </h1>
          <p className="text-sm text-text-muted mt-1">Döviz ve altın birikimlerinizi serbest piyasa ve banka kurlarıyla takip edin.</p>
        </div>
        <Button onClick={() => setIsBuyModalOpen(true)} className="px-4 py-2 text-sm shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Varlık Ekle
        </Button>
      </div>

      <SavingsSummaryBar assets={assets} marketRates={marketRates} />

      <Card className="overflow-hidden border border-border bg-bg-card backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-bg-sidebar/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold text-text-secondary">Varlık</th>
                <th className="px-4 py-3 font-semibold text-text-secondary">Banka/Piyasa</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-right">Miktar</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-right">Ort. Maliyet</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-right">Güncel Fiyat</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-right">Kar/Zarar</th>
                <th className="px-4 py-3 font-semibold text-text-secondary text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                    Henüz bir tasarruf varlığı eklemediniz.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const rateObj = marketRates.find(r => r.code === asset.code);
                  const currentRate = rateObj ? rateObj.buying : asset.averageCost;
                  const totalCost = asset.quantity * asset.averageCost;
                  const currentValue = asset.quantity * currentRate;
                  const profitLoss = currentValue - totalCost;
                  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
                  const isProfit = profitLoss >= 0;

                  return (
                    <tr key={asset.id} className="group hover:bg-bg-sidebar/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${
                            asset.type === 'GOLD' ? 'bg-amber-500/20 text-amber-500' : 
                            asset.type === 'SILVER' ? 'bg-slate-400/20 text-slate-400' :
                            asset.type === 'FUND' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            <Coins className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">{asset.code}</div>
                            <div className="text-xs text-text-muted">
                              {asset.type === 'GOLD' ? 'Altın' : 
                               asset.type === 'SILVER' ? 'Gümüş/Platin' :
                               asset.type === 'FUND' ? 'Fon' : 'Döviz'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                          {asset.bank || 'Serbest Piyasa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">
                        {asset.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        {formatCurrency(asset.averageCost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-text-primary font-medium text-sm">
                            <span className="text-text-muted mr-1 text-xs">A:</span>
                            {formatCurrency(rateObj?.buying || asset.averageCost)}
                          </span>
                          {rateObj?.selling && (
                            <span className="text-text-secondary text-xs mt-0.5">
                              <span className="text-text-muted mr-1">S:</span>
                              {formatCurrency(rateObj.selling)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-medium flex items-center gap-1 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isProfit ? '+' : ''}{formatCurrency(profitLoss)}
                          </span>
                          <span className={`text-xs ${isProfit ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                            {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setTxModalData({ isOpen: true, asset })}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            title="İşlem Geçmişi"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setBuyModalAsset(asset);
                              setIsBuyModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                            title="Alış Ekle"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setSellModalData({ isOpen: true, asset, currentRate })}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                            title="Satış Yap"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditModalData({ isOpen: true, asset })}
                            className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(asset.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SavingsBuyModal 
        isOpen={isBuyModalOpen} 
        onClose={() => {
          setIsBuyModalOpen(false);
          setBuyModalAsset(null);
        }} 
        onSuccess={loadData} 
        initialAsset={buyModalAsset}
      />

      {sellModalData.isOpen && (
        <SavingsSellModal
          isOpen={sellModalData.isOpen}
          onClose={() => setSellModalData(prev => ({ ...prev, isOpen: false }))}
          onSuccess={loadData}
          asset={sellModalData.asset}
          currentRate={sellModalData.currentRate}
        />
      )}

      {editModalData.isOpen && (
        <SavingsEditModal
          isOpen={editModalData.isOpen}
          onClose={() => setEditModalData(prev => ({ ...prev, isOpen: false }))}
          onSuccess={loadData}
          asset={editModalData.asset}
        />
      )}

      {txModalData.isOpen && (
        <SavingsTransactionsModal
          isOpen={txModalData.isOpen}
          onClose={() => setTxModalData(prev => ({ ...prev, isOpen: false }))}
          asset={txModalData.asset}
        />
      )}
    </div>
  );
}
