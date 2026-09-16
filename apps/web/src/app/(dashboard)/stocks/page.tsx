'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, HelpCircle, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

import { StockSummaryBar } from '@/components/stocks/StockSummaryBar';
import { StockTable, StockItem } from '@/components/stocks/StockTable';
import { StockBuyModal } from '@/components/stocks/StockBuyModal';
import { StockSellModal } from '@/components/stocks/StockSellModal';
import { StockTransactionsModal } from '@/components/stocks/StockTransactionsModal';
import { StockEditModal } from '@/components/stocks/StockEditModal';

export default function StocksPage() {
  const { confirm } = useConfirm();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

  // Modals state
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedBuySymbol, setSelectedBuySymbol] = useState('');
  const [selectedSellSymbol, setSelectedSellSymbol] = useState('');
  const [selectedMaxQuantity, setSelectedMaxQuantity] = useState(0);
  const [selectedHistorySymbol, setSelectedHistorySymbol] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStockForEdit, setSelectedStockForEdit] = useState<StockItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stocksData, summaryData] = await Promise.all([
        fetchApi<StockItem[]>('/stocks'),
        fetchApi('/stocks/summary'),
      ]);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
      setSummary(summaryData);
    } catch (error: any) {
      toast.error(error.message || 'Hisse verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Auto refresh every 5 minutes during market hours
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleOpenBuy = (symbol = '') => {
    setSelectedBuySymbol(symbol);
    setIsBuyModalOpen(true);
  };

  const handleOpenSell = (symbol: string, maxQuantity: number) => {
    setSelectedSellSymbol(symbol);
    setSelectedMaxQuantity(maxQuantity);
    setIsSellModalOpen(true);
  };

  const handleOpenHistory = (symbol: string) => {
    setSelectedHistorySymbol(symbol);
    setIsHistoryModalOpen(true);
  };

  const handleOpenEdit = (stock: StockItem) => {
    setSelectedStockForEdit(stock);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data: { quantity: number; averageCost: number }) => {
    if (!selectedStockForEdit) return;
    const symbol = selectedStockForEdit.symbol.replace('.IS', '');
    await fetchApi(`/stocks/${symbol}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setIsEditModalOpen(false);
    loadData();
  };

  const handleDelete = async (symbol: string) => {
    const ticker = symbol.replace('.IS', '');
    const ok = await confirm({
      title: 'Hisse Senedini Sil',
      message: `${ticker} hissesini portföyden silmek istediğinize emin misiniz? Geçmiş alım/satım işlemleri de silinecektir.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await fetchApi(`/stocks/${ticker}`, {
        method: 'DELETE',
      });
      toast.success('Hisse başarıyla silindi.');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Hisse silinirken bir hata oluştu.');
    }
  };

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const matchesSearch = 
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (stock.name && stock.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const isProfit = stock.pnlAmount >= 0;
      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'PROFIT' ? isProfit :
        !isProfit;

      return matchesSearch && matchesStatus;
    });
  }, [stocks, searchQuery, statusFilter]);

  const isOverallPositive = (summary?.totalPnL || 0) >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Hisselerim
            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className="text-text-muted hover:text-emerald-400 transition-colors p-1 rounded-lg"
              title="Bilgilendirme ve Açıklamalar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">
            Borsa İstanbul (BIST) hisse senedi portföyünüzü ve anlık piyasa getirilerinizi takip edin.
          </p>
        </div>
        <Button onClick={() => handleOpenBuy()} className="px-4 py-2 text-sm shadow-sm gap-2">
          <Plus className="w-4 h-4" /> Yeni Hisse Ekle
        </Button>
      </div>

      {/* 4 Reference KPI Cards */}
      <StockSummaryBar summary={summary} loading={loading} stockCount={stocks.length} />

      {/* Bilgilendirme & Durum Banner'ı (Taksitli Alacaklar Stili) */}
      <div className={`rounded-2xl p-4 border transition-all ${
        isOverallPositive 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            isOverallPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isOverallPositive ? <Sparkles className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-bold ${isOverallPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isOverallPositive ? 'Hisse Portföyü Kârda' : 'Hisse Portföyü Zararda'}
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {isOverallPositive ? (
                <>
                  Tebrikler! Borsa İstanbul hisse senedi portföyünüz şu anda toplamda <strong>%{summary?.totalPnLPercentage?.toFixed(2) || '0'}</strong> kâr durumundadır. Canlı BIST verileriyle anlık kâr/zarar durumunuz güncellenmektedir.
                </>
              ) : (
                <>
                  Portföyünüz şu anda toplam maliyetinin altında seyretmektedir (<strong>%{Math.abs(summary?.totalPnLPercentage || 0).toFixed(2)}</strong> zarar). Hisse bazlı ortalama maliyetlerinizi gözden geçirebilirsiniz.
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
              <span className="font-bold text-blue-400 block mb-1">1. Portföy Değeri</span>
              Her hissenin sahip olduğunuz lot miktarı ile Borsa İstanbul anlık son işlem fiyatının çarpımıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-slate-300 block mb-1">2. Toplam Maliyet</span>
              Geçmiş alım işlemleriniz ve işlem komisyonlarınız baz alınarak hesaplanan ağırlıklı ortalama maliyet toplamıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-emerald-400 block mb-1">3. Kâr / Zarar</span>
              Güncel piyasa değeri ile toplam alış maliyeti arasındaki net TL farkıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-purple-400 block mb-1">4. Getiri Performansı</span>
              Portföyünüzün toplam maliyetine oranla elde edilen yüzde getirisidir.
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
            placeholder="Hisse sembolü (örn. THYAO) veya şirket adı ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'PROFIT', label: 'Kârda Olanlar' },
            { id: 'LOSS', label: 'Zararda Olanlar' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                statusFilter === f.id
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <StockTable
        stocks={filteredStocks}
        loading={loading}
        onBuy={handleOpenBuy}
        onSell={handleOpenSell}
        onHistory={handleOpenHistory}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {isBuyModalOpen && (
        <StockBuyModal
          isOpen={isBuyModalOpen}
          onClose={() => setIsBuyModalOpen(false)}
          onSuccess={loadData}
          initialSymbol={selectedBuySymbol}
        />
      )}

      {isSellModalOpen && (
        <StockSellModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          onSuccess={loadData}
          symbol={selectedSellSymbol}
          maxQuantity={selectedMaxQuantity}
        />
      )}

      {isHistoryModalOpen && (
        <StockTransactionsModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          symbol={selectedHistorySymbol}
        />
      )}

      {isEditModalOpen && selectedStockForEdit && (
        <StockEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          symbol={selectedStockForEdit.symbol}
          initialQuantity={selectedStockForEdit.quantity}
          initialAverageCost={selectedStockForEdit.averageCost}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
