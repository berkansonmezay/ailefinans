'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
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
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Hisselerim</h1>
          <p className="text-text-muted mt-1">
            Borsa İstanbul portföyünüzü canlı fiyatlarla takip edin.
          </p>
        </div>
        <Button onClick={() => handleOpenBuy()} className="gap-2">
          <Plus className="w-4 h-4" /> Yeni Hisse Ekle
        </Button>
      </div>

      <StockSummaryBar summary={summary} loading={loading} />

      <StockTable
        stocks={stocks}
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
          symbol={selectedStockForEdit.symbol.replace('.IS', '')}
          initialQuantity={selectedStockForEdit.quantity}
          initialAverageCost={selectedStockForEdit.averageCost}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
