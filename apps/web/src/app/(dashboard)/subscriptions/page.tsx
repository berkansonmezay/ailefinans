'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, Repeat, CreditCard, Edit2, Trash2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Subscription {
  id: string;
  name: string;
  provider: string | null;
  amount: number;
  currency: string;
  frequency: string;
  startDate: string;
  nextPaymentDate: string | null;
  status: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    frequency: 'MONTHLY',
    startDate: '',
  });

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/subscriptions');
      setSubscriptions(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error: any) {
      toast.error(error.message || 'Abonelikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', provider: '', amount: '', frequency: 'MONTHLY', startDate: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const handleEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setFormData({
      name: sub.name,
      provider: sub.provider || '',
      amount: sub.amount.toString(),
      frequency: sub.frequency,
      startDate: sub.startDate.split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu aboneliği iptal edip silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/subscriptions/${id}`, { method: 'DELETE' });
      toast.success('Abonelik silindi');
      loadSubscriptions();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        provider: formData.provider,
        amount: Number(formData.amount),
        frequency: formData.frequency,
        startDate: new Date(formData.startDate).toISOString(),
      };

      if (editingId) {
        await fetchApi(`/subscriptions/${editingId}`, {
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
      setIsModalOpen(false);
      loadSubscriptions();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'WEEKLY': return 'Haftalık';
      case 'MONTHLY': return 'Aylık';
      case 'QUARTERLY': return '3 Aylık';
      case 'YEARLY': return 'Yıllık';
      default: return freq;
    }
  };

  const calculateMonthlyTotal = () => {
    return subscriptions.reduce((total, sub) => {
      if (sub.status !== 'ACTIVE') return total;
      let monthlyAmt = sub.amount;
      if (sub.frequency === 'WEEKLY') monthlyAmt = sub.amount * 4.33;
      if (sub.frequency === 'QUARTERLY') monthlyAmt = sub.amount / 3;
      if (sub.frequency === 'YEARLY') monthlyAmt = sub.amount / 12;
      return total + monthlyAmt;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Abonelikler</h1>
          <p className="text-text-muted mt-1">Düzenli ödemelerinizi ve dijital aboneliklerinizi takip edin.</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-5 h-5 mr-2" />
          Abonelik Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-1 border-border bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <CardContent className="p-6 flex flex-col justify-center items-center text-center h-full">
            <h3 className="text-text-muted font-medium mb-2">Aylık Tahmini Gider</h3>
            <div className="text-4xl font-bold text-text-primary tracking-tight">
              {calculateMonthlyTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg text-text-muted">TRY</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-text-muted">Yükleniyor...</p>
        ) : subscriptions.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
            <Repeat className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz abonelik eklenmemiş</h3>
            <p className="text-text-muted">Netflix, Spotify, spor salonu gibi düzenli giderlerinizi ekleyin.</p>
          </div>
        ) : (
          subscriptions.map(sub => (
            <Card key={sub.id} className="group border-border bg-bg-card backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-pink-500/20 rounded-2xl text-pink-400">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary leading-tight">{sub.name}</h3>
                      <p className="text-sm text-text-muted">{sub.provider}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(sub)} className="text-text-muted hover:text-emerald-400 p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(sub.id)} className="text-text-muted hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-bold text-text-primary">{sub.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-text-muted pb-1">{sub.currency}</span>
                  <span className="text-text-muted text-sm pb-1 ml-auto">/ {getFrequencyLabel(sub.frequency)}</span>
                </div>

                {sub.nextPaymentDate && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center text-sm text-text-muted">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                    Sonraki ödeme: <span className="text-text-primary ml-1">{new Date(sub.nextPaymentDate).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Abonelik Düzenle" : "Yeni Abonelik Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Abonelik Adı" 
            placeholder="Örn: Netflix Premium" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input 
            label="Sağlayıcı (Opsiyonel)" 
            placeholder="Örn: Netflix Inc." 
            value={formData.provider}
            onChange={(e) => setFormData({...formData, provider: e.target.value})}
          />
          <Input 
            label="Tutar" 
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            required
          />
          <Select 
            label="Sıklık"
            value={formData.frequency}
            onChange={(e) => setFormData({...formData, frequency: e.target.value})}
            options={[
              { value: 'WEEKLY', label: 'Haftalık' },
              { value: 'MONTHLY', label: 'Aylık' },
              { value: 'QUARTERLY', label: '3 Aylık' },
              { value: 'YEARLY', label: 'Yıllık' },
            ]}
          />
          <Input 
            label="Başlangıç Tarihi" 
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            required
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
