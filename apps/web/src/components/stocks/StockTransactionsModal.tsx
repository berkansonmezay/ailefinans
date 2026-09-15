'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { fetchApi } from '@/lib/api';

interface StockTransaction {
  id: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  date: string;
  notes?: string;
}

interface StockTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(val);
}

export function StockTransactionsModal({ isOpen, onClose, symbol }: StockTransactionsModalProps) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && symbol) {
      loadTransactions();
    }
  }, [isOpen, symbol]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<StockTransaction[]>(`/stocks/${symbol}/transactions`);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${symbol.replace('.IS', '')} İşlem Geçmişi`}>
      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Yükleniyor...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-text-muted">İşlem geçmişi bulunamadı.</div>
        ) : (
          transactions.map((tx) => {
            const isBuy = tx.type === 'BUY';
            const total = tx.price * tx.quantity;
            return (
              <div key={tx.id} className="p-3 rounded-xl border border-border bg-bg-secondary/50">
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
                        isBuy ? 'bg-blue-500/20 text-blue-500' : 'bg-rose-500/20 text-rose-500'
                      }`}
                    >
                      {isBuy ? 'ALIM' : 'SATIM'}
                    </span>
                    <p className="text-sm font-semibold text-text-primary">{formatDate(tx.date)}</p>
                    {tx.notes && <p className="text-xs text-text-muted mt-0.5">{tx.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">
                      {tx.quantity} Lot @ {formatCurrency(tx.price)}
                    </p>
                    <p className={`text-xs font-semibold ${isBuy ? 'text-text-muted' : 'text-success'}`}>
                      {isBuy ? '-' : '+'}{formatCurrency(total)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
