import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

interface SavingsSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: any;
  currentRate: number;
}

export function SavingsSellModal({ isOpen, onClose, onSuccess, asset, currentRate }: SavingsSellModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentRate?.toString() || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parseFloat(quantity) > asset.quantity) {
      toast.error('Sahip olduğunuzdan fazla miktar satamazsınız');
      return;
    }

    setLoading(true);

    try {
      await fetchApi('/savings-assets/transaction', {
        method: 'POST',
        body: JSON.stringify({
          code: asset.code,
          type: asset.type,
          bank: asset.bank,
          transactionType: 'SELL',
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          date,
          notes
        }),
      });

      toast.success('Satış işlemi başarıyla eklendi');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${asset?.code} Sat`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg text-sm mb-4">
          Mevcut Miktar: {asset?.quantity}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Satış Miktarı"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            max={asset?.quantity}
            placeholder="0.00"
          />
          <Input
            label="Satış Fiyatı (₺)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="İşlem Tarihi"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Notlar (İsteğe Bağlı)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Açıklama girin..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Satış Ekle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
