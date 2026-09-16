import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';

interface SavingsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: any;
}

export function SavingsEditModal({ isOpen, onClose, onSuccess, asset }: SavingsEditModalProps) {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [averageCost, setAverageCost] = useState('');

  useEffect(() => {
    if (isOpen && asset) {
      setQuantity(asset.quantity?.toString() || '0');
      setAverageCost(asset.averageCost?.toString() || '0');
    }
  }, [isOpen, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !averageCost) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      await fetchApi(`/savings-assets/${asset.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantity: parseFloat(quantity),
          averageCost: parseFloat(averageCost),
        }),
      });
      
      toast.success('Varlık başarıyla güncellendi');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Varlık güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Varlığı Sil',
      message: 'Bu birikim varlığını silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await fetchApi(`/savings-assets/${asset.id}`, {
        method: 'DELETE',
      });
      
      toast.success('Varlık başarıyla silindi');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Varlık silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Varlık Düzenle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Varlık Kodu
          </label>
          <div className="p-3 bg-bg-secondary rounded-lg border border-border/50 text-text-primary">
            {asset?.code} {asset?.bank ? `(${asset.bank})` : ''}
          </div>
        </div>

        <Input
          label="Miktar"
          type="number"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
          required
        />

        <Input
          label="Ortalama Maliyet (₺)"
          type="number"
          step="0.01"
          value={averageCost}
          onChange={(e) => setAverageCost(e.target.value)}
          placeholder="0.00"
          required
        />

        <div className="flex justify-between items-center pt-4 border-t border-border/50">
          <Button 
            type="button" 
            variant="secondary"
            className="text-rose-500 border-rose-500 hover:bg-rose-500/10"
            onClick={handleDelete}
            disabled={loading}
          >
            Varlığı Sil
          </Button>
          <div className="flex space-x-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
