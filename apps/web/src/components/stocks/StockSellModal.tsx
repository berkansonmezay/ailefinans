'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

interface StockSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  symbol: string;
  maxQuantity: number;
}

export function StockSellModal({ isOpen, onClose, onSuccess, symbol, maxQuantity }: StockSellModalProps) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !price || !date) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    const sellQty = parseFloat(quantity);
    if (sellQty > maxQuantity) {
      toast.error(`Maksimum satılabilir lot sayısı: ${maxQuantity}`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      await fetchApi('/stocks/sell', {
        method: 'POST',
        body: JSON.stringify({
          symbol,
          quantity: sellQty,
          price: parseFloat(price),
          date,
          notes,
        }),
      });

      toast.success('Hisse satışı başarıyla kaydedildi.');
      onSuccess();
      onClose();
      
      setQuantity('');
      setPrice('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Satış kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${symbol.replace('.IS', '')} Satışı`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Satılacak Lot <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 pr-16 text-text-primary focus:outline-none focus:border-accent"
                placeholder="100"
                required
              />
              <button 
                type="button"
                onClick={() => setQuantity(maxQuantity.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-bg-card border border-border px-1.5 py-0.5 rounded"
              >
                TÜMÜ
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1">Mevcut: {maxQuantity} lot</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Satış Fiyatı (₺) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
              placeholder="350.50"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Tarih <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Notlar (Opsiyonel)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        {quantity && price && (
           <div className="p-3 bg-bg-secondary/50 rounded-xl border border-border flex justify-between items-center">
             <span className="text-sm text-text-muted">Ele Geçen Tutar:</span>
             <span className="font-bold text-success">
               +{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(parseFloat(quantity) * parseFloat(price))}
             </span>
           </div>
        )}

        <div className="flex justify-end gap-3 pt-2 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Satışı Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
