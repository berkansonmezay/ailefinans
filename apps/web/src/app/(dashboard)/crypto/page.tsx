'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

import { CryptoSummaryBar } from '@/components/crypto/CryptoSummaryBar';
import { CryptoTable, CryptoItem } from '@/components/crypto/CryptoTable';
import { CryptoBuyModal } from '@/components/crypto/CryptoBuyModal';
import { CryptoSellModal } from '@/components/crypto/CryptoSellModal';
import { CryptoTransactionsModal } from '@/components/crypto/CryptoTransactionsModal';
import { CryptoEditModal } from '@/components/crypto/CryptoEditModal';

export default function CryptosPage() {
  const [cryptos, setCryptos] = useState<CryptoItem[]>([]);
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
  const [selectedCryptoForEdit, setSelectedCryptoForEdit] = useState<CryptoItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cryptosData, summaryData] = await Promise.all([
        fetchApi<CryptoItem[]>('/crypto'),
        fetchApi('/crypto/summary'),
      ]);
      setCryptos(Array.isArray(cryptosData) ? cryptosData : []);
      setSummary(summaryData);
    } catch (error: any) {
      toast.error(error.message || 'Kripto verileri yüklenemedi.');
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

  const handleOpenEdit = (crypto: CryptoItem) => {
    setSelectedCryptoForEdit(crypto);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data: { quantity: number; averageCost: number }) => {
    if (!selectedCryptoForEdit) return;
    const symbol = selectedCryptoForEdit.symbol;
    await fetchApi(`/crypto/${symbol}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setIsEditModalOpen(false);
    loadData();
  };

  const handleDelete = async (symbol: string) => {
    if (window.confirm(`${symbol} kriptosini portföyden silmek istediğinize emin misiniz? (Geçmiş işlemleri de silinecektir)`)) {
      try {
        await fetchApi(`/crypto/${symbol}`, {
          method: 'DELETE',
        });
        toast.success('Kripto başarıyla silindi.');
        loadData();
      } catch (error: any) {
        toast.error(error.message || 'Kripto silinirken bir hata oluştu.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Kriptolerim</h1>
          <p className="text-text-muted mt-1">
            Piyasa İstanbul portföyünüzü canlı fiyatlarla takip edin.
          </p>
        </div>
        <Button onClick={() => handleOpenBuy()} className="gap-2">
          <Plus className="w-4 h-4" /> Yeni Kripto Ekle
        </Button>
      </div>

      <CryptoSummaryBar summary={summary} loading={loading} />

      <CryptoTable
        cryptos={cryptos}
        loading={loading}
        onBuy={handleOpenBuy}
        onSell={handleOpenSell}
        onHistory={handleOpenHistory}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {isBuyModalOpen && (
        <CryptoBuyModal
          isOpen={isBuyModalOpen}
          onClose={() => setIsBuyModalOpen(false)}
          onSuccess={loadData}
          initialSymbol={selectedBuySymbol}
        />
      )}

      {isSellModalOpen && (
        <CryptoSellModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          onSuccess={loadData}
          symbol={selectedSellSymbol}
          maxQuantity={selectedMaxQuantity}
        />
      )}

      {isHistoryModalOpen && (
        <CryptoTransactionsModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          symbol={selectedHistorySymbol}
        />
      )}

      {isEditModalOpen && selectedCryptoForEdit && (
        <CryptoEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          symbol={selectedCryptoForEdit.symbol}
          initialQuantity={selectedCryptoForEdit.quantity}
          initialAverageCost={selectedCryptoForEdit.averageCost}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
