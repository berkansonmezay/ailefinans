'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, CreditCard, CalendarDays, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DebtsPage() {
  const [activeTab, setActiveTab] = useState<'DEBTS' | 'RECEIVABLES'>('DEBTS');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    creditor: '',
    description: '',
    totalAmount: '',
    currency: 'TRY',
    installmentCount: '1',
    installmentAmount: '',
    firstPaymentDate: new Date().toISOString().split('T')[0],
    accountId: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'DEBTS' ? '/debts' : '/receivables';
      
      const [itemsRes, accRes] = await Promise.all([
        fetchApi<any>(endpoint),
        fetchApi<any>('/accounts')
      ]);

      setItems(itemsRes.items || itemsRes.data || []);
      setAccounts(accRes.items || accRes.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'DEBTS' ? '/debts' : '/receivables';
      const body: any = {
        description: formData.description,
        totalAmount: Number(formData.totalAmount),
        currency: formData.currency,
        accountId: formData.accountId,
      };

      if (activeTab === 'DEBTS') {
        body.creditor = formData.creditor;
        body.installmentCount = Number(formData.installmentCount);
        body.installmentAmount = Number(formData.installmentAmount);
        body.firstPaymentDate = new Date(formData.firstPaymentDate).toISOString();
        body.principalAmount = body.totalAmount;
      } else {
        body.debtor = formData.creditor; // Reusing creditor field for debtor
        body.dueDate = new Date(formData.firstPaymentDate).toISOString();
      }

      await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      toast.success('Kayıt başarıyla oluşturuldu');
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Kayıt oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Borç ve Alacaklar</h1>
          <p className="text-text-muted mt-1">Taksitli borçlarınızı ve alacaklarınızı yönetin.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-bg-card p-1 rounded-xl border border-border flex">
            <button
              onClick={() => setActiveTab('DEBTS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'DEBTS' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Borçlar
            </button>
            <button
              onClick={() => setActiveTab('RECEIVABLES')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'RECEIVABLES' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Alacaklar
            </button>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Yeni {activeTab === 'DEBTS' ? 'Borç' : 'Alacak'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-text-muted">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-3xl border border-border">
            <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz kayıt yok</h3>
            <p className="text-text-muted mb-6">Herhangi bir {activeTab === 'DEBTS' ? 'borç' : 'alacak'} kaydınız bulunmuyor.</p>
            <Button onClick={() => setIsModalOpen(true)}>Kayıt Ekle</Button>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="hover:border-emerald-500/30 transition-colors">
              <CardContent>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-bg-secondary rounded-2xl text-emerald-400">
                    {activeTab === 'DEBTS' ? <CreditCard className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    item.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.status === 'PAID' ? 'Ödendi' : 'Aktif'}
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-text-primary">{item.description}</h4>
                <p className="text-sm text-text-muted mb-4">{activeTab === 'DEBTS' ? item.creditor : item.debtor}</p>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Kalan Tutar</span>
                    <span className="font-bold text-text-primary">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: item.currency || 'TRY' }).format(item.remainingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Toplam</span>
                    <span className="text-text-secondary">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: item.currency || 'TRY' }).format(item.totalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Yeni ${activeTab === 'DEBTS' ? 'Borç' : 'Alacak'} Ekle`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label={activeTab === 'DEBTS' ? 'Alacaklı (Kurum/Kişi)' : 'Borçlu Kişi/Kurum'} 
            placeholder="Örn: Garanti Bankası" 
            value={formData.creditor}
            onChange={(e) => setFormData({...formData, creditor: e.target.value})}
            required
          />
          <Input 
            label="Açıklama" 
            placeholder="Örn: Ev Kredisi" 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Toplam Tutar" 
              type="number"
              step="0.01"
              value={formData.totalAmount}
              onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
              required
            />
            <Select 
              label="İlişkili Hesap"
              value={formData.accountId}
              onChange={(e) => setFormData({...formData, accountId: e.target.value})}
              required
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
            />
          </div>
          
          {activeTab === 'DEBTS' && (
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 mt-2">
              <Input 
                label="Taksit Sayısı" 
                type="number"
                value={formData.installmentCount}
                onChange={(e) => setFormData({...formData, installmentCount: e.target.value})}
                required={activeTab === 'DEBTS'}
              />
              <Input 
                label="Taksit Tutarı" 
                type="number"
                step="0.01"
                value={formData.installmentAmount}
                onChange={(e) => setFormData({...formData, installmentAmount: e.target.value})}
                required={activeTab === 'DEBTS'}
              />
            </div>
          )}

          <Input 
            label={activeTab === 'DEBTS' ? 'İlk Ödeme Tarihi' : 'Vade Tarihi'} 
            type="date"
            value={formData.firstPaymentDate}
            onChange={(e) => setFormData({...formData, firstPaymentDate: e.target.value})}
            required
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              İptal
            </Button>
            <Button type="submit">
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
