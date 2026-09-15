import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface StockEditModalProps {
  symbol: string;
  initialQuantity: number;
  initialAverageCost: number;
  onClose: () => void;
  onSubmit: (data: { quantity: number; averageCost: number }) => Promise<void>;
}

export function StockEditModal({
  symbol,
  initialQuantity,
  initialAverageCost,
  onClose,
  onSubmit,
}: StockEditModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity.toString());
  const [averageCost, setAverageCost] = useState(initialAverageCost.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !averageCost) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        quantity: parseFloat(quantity),
        averageCost: parseFloat(averageCost),
      });
      toast.success('Hisse bilgileri güncellendi.');
    } catch (error: any) {
      toast.error(error.message || 'Güncelleme başarısız oldu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="text-xl font-bold text-text-primary">Hisse Düzenle</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Hisse Kodu
              </label>
              <input
                type="text"
                value={symbol}
                disabled
                className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none opacity-50 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Lot Sayısı <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Ort. Maliyet (₺) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={averageCost}
                  onChange={(e) => setAverageCost(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
              <Button type="button" variant="ghost" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
