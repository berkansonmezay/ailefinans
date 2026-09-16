'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { SavingsBuyModal } from '@/components/savings/SavingsBuyModal';
import { SavingsSellModal } from '@/components/savings/SavingsSellModal';
import { SavingsSummaryBar } from '@/components/savings/SavingsSummaryBar';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { SavingsEditModal } from '@/components/savings/SavingsEditModal';
import { SavingsTransactionsModal } from '@/components/savings/SavingsTransactionsModal';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  ArrowRightLeft, 
  Edit, 
  Trash2, 
  List, 
  HelpCircle, 
  Search, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

export default function SavingsPage() {
  const { confirm } = useConfirm();
  const [assets, setAssets] = useState<any[]>([]);
  const [marketRates, setMarketRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GOLD' | 'CURRENCY'>('ALL');
  
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
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setMarketRates((ratesData as any)?.rates || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMarketRate = (code: string) => {
    const rate = marketRates.find(r => r.code === code);
    return rate ? Number(rate.buying) : null;
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Birikim Varlığını Sil',
      message: 'Bu birikim varlığını tamamen silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;

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

  // Portfolio total statistics
  const stats = useMemo(() => {
    let totalInvestment = 0;
    let totalCurrentValue = 0;

    assets.forEach(asset => {
      const qty = Number(asset.quantity) || 0;
      const avgCost = Number(asset.averageCost) || 0;
      totalInvestment += qty * avgCost;
      const rate = marketRates.find(r => r.code === asset.code);
      const currentPrice = rate ? Number(rate.buying) : avgCost;
      totalCurrentValue += qty * currentPrice;
    });

    const totalPnL = totalCurrentValue - totalInvestment;
    const pnlPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
    const isPositive = totalPnL >= 0;

    return {
      totalInvestment,
      totalCurrentValue,
      totalPnL,
      pnlPercentage,
      isPositive,
    };
  }, [assets, marketRates]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = 
        asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.bank && asset.bank.toLowerCase().includes(searchQuery.toLowerCase()));

      const isGold = asset.type === 'GOLD' || asset.type === 'SILVER';
      const matchesType = 
        typeFilter === 'ALL' ? true :
        typeFilter === 'GOLD' ? isGold :
        !isGold;

      return matchesSearch && matchesType;
    });
  }, [assets, searchQuery, typeFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Altın & Döviz
            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className="text-text-muted hover:text-emerald-400 transition-colors p-1 rounded-lg"
              title="Bilgilendirme ve Açıklamalar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">
            Döviz ve altın birikimlerinizi serbest piyasa ve banka kurlarıyla anlık takip edin.
          </p>
        </div>
        <Button onClick={() => { setBuyModalAsset(null); setIsBuyModalOpen(true); }} className="px-4 py-2 text-sm shadow-sm gap-2">
          <Plus className="w-4 h-4" />
          Yeni Varlık Ekle
        </Button>
      </div>

      {/* 4 Reference KPI Cards */}
      <SavingsSummaryBar assets={assets} marketRates={marketRates} />

      {/* Bilgilendirme & Durum Banner'ı */}
      <div className={`rounded-2xl p-4 border transition-all ${
        stats.isPositive 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            stats.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {stats.isPositive ? <Sparkles className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-bold ${stats.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.isPositive ? 'Altın & Döviz Portföyü Kârda' : 'Altın & Döviz Portföyü Maliyet Altında'}
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {stats.isPositive ? (
                <>
                  Tebrikler! Altın ve döviz varlıklarınız güncel serbest piyasa ve banka kurlarına göre toplam <strong>%{stats.pnlPercentage.toFixed(2)}</strong> kâr durumundadır.
                </>
              ) : (
                <>
                  Altın ve döviz birikimleriniz toplam maliyetine göre <strong>%{Math.abs(stats.pnlPercentage).toFixed(2)}</strong> değer kaybında görünmektedir. Uzun vadeli ortalama maliyetinizi takip edebilirsiniz.
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowInfoGuide(!showInfoGuide)}
            className="text-xs font-semibold underline text-text-muted hover:text-text-primary transition-colors flex-shrink-0 pt-0.5"
          >
            {showInfoGuide ? 'Rehberi Gizle' : 'Nasıl Hesaplanır?'}
          </button>
        </div>

        {/* Rehber Açıklama Kutuları */}
        {showInfoGuide && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-text-secondary">
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-blue-400 block mb-1">1. Güncel Değer</span>
              Varlık miktarınız ile ilgili varlığın serbest piyasa alış kurunun çarpımıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-amber-400 block mb-1">2. Toplam Yatırım</span>
              Alım yaptığınız tarihlerdeki birim maliyetlerin toplamıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-emerald-400 block mb-1">3. Kâr / Zarar</span>
              Mevcut piyasa değeri ile toplam alım maliyeti arasındaki net TL farkıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-purple-400 block mb-1">4. Getiri Oranı</span>
              Yatırım maliyetinize oranla sağlanan net yüzde getirisidir.
            </div>
          </div>
        )}
      </div>

      {/* Arama ve Filtre Toolbar'ı */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input 
            type="text" 
            placeholder="Varlık kodu (örn. USD, GRAM, EUR) veya banka ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'GOLD', label: 'Altın & Değerli Maden' },
            { id: 'CURRENCY', label: 'Döviz' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                typeFilter === f.id
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Varlık Tablosu */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-bg-sidebar border-b border-border text-text-secondary">
                <th className="px-5 py-3 font-semibold">Varlık</th>
                <th className="px-5 py-3 font-semibold">Banka / Piyasa</th>
                <th className="px-5 py-3 font-semibold text-right">Miktar</th>
                <th className="px-5 py-3 font-semibold text-right">Ort. Maliyet</th>
                <th className="px-5 py-3 font-semibold text-right">Piyasa Alış/Satış</th>
                <th className="px-5 py-3 font-semibold text-right">Kâr / Zarar</th>
                <th className="px-5 py-3 font-semibold text-right">Toplam Değer</th>
                <th className="px-5 py-3 font-semibold text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-text-muted">
                    <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                    Varlıklar yükleniyor...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-text-muted">
                    <Coins className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    Henüz kayıtlı birikim varlığı bulunmuyor.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const rateObj = marketRates.find(r => r.code === asset.code);
                  const currentRate = rateObj ? Number(rateObj.buying) : asset.averageCost;
                  const totalCost = asset.quantity * asset.averageCost;
                  const currentValue = asset.quantity * currentRate;
                  const profitLoss = currentValue - totalCost;
                  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
                  const isProfit = profitLoss >= 0;

                  return (
                    <tr key={asset.id} className="hover:bg-bg-sidebar/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            asset.type === 'GOLD' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                            asset.type === 'SILVER' ? 'bg-slate-400/10 text-slate-400 border-slate-400/20' :
                            asset.type === 'FUND' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            <Coins className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm">{asset.code}</div>
                            <div className="text-xs text-text-muted">
                              {asset.type === 'GOLD' ? 'Altın' : 
                               asset.type === 'SILVER' ? 'Gümüş/Platin' :
                               asset.type === 'FUND' ? 'Fon' : 'Döviz'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                          {asset.bank || 'Serbest Piyasa'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-text-primary">
                        {asset.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-text-secondary">
                        {formatCurrency(asset.averageCost)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-text-primary font-bold text-sm">
                            <span className="text-text-muted mr-1 text-[11px] font-normal">A:</span>
                            {formatCurrency(rateObj?.buying || asset.averageCost)}
                          </span>
                          {rateObj?.selling && (
                            <span className="text-text-secondary text-xs mt-0.5">
                              <span className="text-text-muted mr-1 text-[10px]">S:</span>
                              {formatCurrency(rateObj.selling)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {isProfit ? '+' : ''}{formatCurrency(profitLoss)}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${
                            isProfit 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {isProfit ? '+' : ''}%{profitLossPercent.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-text-primary text-base">
                        {formatCurrency(currentValue)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => {
                              setBuyModalAsset(asset);
                              setIsBuyModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
                            title="Alış Ekle"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setSellModalData({ isOpen: true, asset, currentRate })}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors border border-amber-500/20"
                            title="Satış Yap"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 rotate-180" />
                          </button>
                          <button 
                            onClick={() => setTxModalData({ isOpen: true, asset })}
                            className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-text-primary transition-colors border border-border"
                            title="İşlem Geçmişi"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setEditModalData({ isOpen: true, asset })}
                            className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors border border-border"
                            title="Düzenle"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(asset.id)}
                            className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-rose-500 transition-colors border border-border"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {isBuyModalOpen && (
        <SavingsBuyModal
          isOpen={isBuyModalOpen}
          onClose={() => {
            setIsBuyModalOpen(false);
            setBuyModalAsset(null);
          }}
          onSuccess={loadData}
          initialAsset={buyModalAsset}
        />
      )}

      {sellModalData.isOpen && (
        <SavingsSellModal
          isOpen={sellModalData.isOpen}
          onClose={() => setSellModalData({ isOpen: false, asset: null, currentRate: 0 })}
          onSuccess={loadData}
          asset={sellModalData.asset}
          currentRate={sellModalData.currentRate}
        />
      )}

      {editModalData.isOpen && (
        <SavingsEditModal
          isOpen={editModalData.isOpen}
          onClose={() => setEditModalData({ isOpen: false, asset: null })}
          onSuccess={loadData}
          asset={editModalData.asset}
        />
      )}

      {txModalData.isOpen && (
        <SavingsTransactionsModal
          isOpen={txModalData.isOpen}
          onClose={() => setTxModalData({ isOpen: false, asset: null })}
          asset={txModalData.asset}
        />
      )}
    </div>
  );
}
