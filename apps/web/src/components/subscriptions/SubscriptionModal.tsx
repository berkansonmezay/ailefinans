'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription?: any;
}

export function SubscriptionModal({ isOpen, onClose, onSuccess, subscription }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    currency: 'TRY',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    nextPaymentDate: new Date().toISOString().split('T')[0],
    autoRenewal: 'true',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        provider: subscription.provider || '',
        amount: subscription.amount.toString(),
        currency: subscription.currency || 'TRY',
        frequency: subscription.frequency || 'MONTHLY',
        startDate: subscription.startDate ? new Date(subscription.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        nextPaymentDate: subscription.nextPaymentDate ? new Date(subscription.nextPaymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        autoRenewal: subscription.autoRenewal ? 'true' : 'false',
        status: subscription.status || 'ACTIVE',
      });
    } else {
      setFormData({
        name: '',
        provider: '',
        amount: '',
        currency: 'TRY',
        frequency: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        nextPaymentDate: new Date().toISOString().split('T')[0],
        autoRenewal: 'true',
        status: 'ACTIVE',
      });
    }
  }, [subscription, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        autoRenewal: formData.autoRenewal === 'true',
      };

      if (subscription) {
        await fetchApi(`/subscriptions/${subscription.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Abonelik güncellendi');
      } else {
        await fetchApi('/subscriptions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Abonelik eklendi');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subscription ? 'Abonelik Düzenle' : 'Yeni Abonelik Ekle'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Abonelik Adı"
          placeholder="Örn: Netflix, Spotify, Gym"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tutar"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
          <Select
            label="Para Birimi"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            options={[
              { value: 'TRY', label: 'TRY (₺)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Ödeme Sıklığı"
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            options={[
              { value: 'WEEKLY', label: 'Haftalık' },
              { value: 'MONTHLY', label: 'Aylık' },
              { value: 'QUARTERLY', label: '3 Aylık' },
              { value: 'YEARLY', label: 'Yıllık' },
            ]}
          />
          <Select
            label="Durum"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'ACTIVE', label: 'Aktif' },
              { value: 'PAUSED', label: 'Durduruldu' },
              { value: 'CANCELLED', label: 'İptal Edildi' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Başlangıç Tarihi"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            label="Sonraki Ödeme"
            type="date"
            value={formData.nextPaymentDate}
            onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
            required
          />
        </div>

        <Select
          label="Otomatik Yenileme"
          value={formData.autoRenewal}
          onChange={(e) => setFormData({ ...formData, autoRenewal: e.target.value })}
          options={[
            { value: 'true', label: 'Açık (Karttan Çekilir)' },
            { value: 'false', label: 'Kapalı (Manuel Ödenir)' },
          ]}
        />

        <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
