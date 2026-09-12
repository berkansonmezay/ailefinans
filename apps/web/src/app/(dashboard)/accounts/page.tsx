'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, Wallet, Building2, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  currency: string;
  institution?: string;
  accountNumber?: string;
}

const ACCOUNT_TYPES = {
  CASH: { label: 'Nakit Kasa', icon: Wallet },
  BANK_ACCOUNT: { label: 'Banka Hesabı', icon: Building2 },
  CREDIT_CARD: { label: 'Kredi Kartı', icon: CreditCard },
  INVESTMENT: { label: 'Yatırım', icon: Building2 },
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK_ACCOUNT',
    balance: '0',
    currency: 'TRY',
    bankName: '',
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/accounts');
      setAccounts(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Hesaplar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'BANK_ACCOUNT', balance: '0', currency: 'TRY', bankName: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.initialBalance.toString(),
      currency: account.currency,
      bankName: account.institution || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/accounts/${id}`, { method: 'DELETE' });
      toast.success('Hesap silindi');
      loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Hesap silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        currency: formData.currency,
        institution: formData.bankName,
        initialBalance: Number(formData.balance),
      };

      if (editingId) {
        await fetchApi(`/accounts/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Hesap başarıyla güncellendi');
      } else {
        await fetchApi('/accounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Hesap başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const totalBalance = accounts.reduce((acc, account) => acc + account.initialBalance, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Hesaplar</h1>
          <p className="text-text-muted mt-1">Tüm banka, kredi kartı ve nakit hesaplarınızı yönetin.</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-5 h-5 mr-2" />
          Yeni Hesap Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent>
            <div className="text-emerald-400 text-sm font-medium mb-1">Toplam Varlık</div>
            <div className="text-3xl font-bold text-text-primary">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-text-muted">Yükleniyor...</div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-3xl border border-border">
            <Wallet className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz hesap yok</h3>
            <p className="text-text-muted mb-6">Finansal işlemlerinizi takip etmek için ilk hesabınızı ekleyin.</p>
            <Button onClick={() => setIsModalOpen(true)}>Hesap Ekle</Button>
          </div>
        ) : (
          accounts.map((account) => {
            const TypeIcon = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.icon || Wallet;
            const typeLabel = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.label || account.type;
            
            return (
              <Card key={account.id} className="hover:border-emerald-500/30 transition-colors group">
                <CardContent>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-bg-secondary rounded-2xl group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(account)} className="text-text-muted hover:text-emerald-400 transition-colors p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(account.id)} className="text-text-muted hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-text-primary">{account.name}</h4>
                  <p className="text-sm text-text-muted mb-4">{typeLabel} {account.institution ? `• ${account.institution}` : ''}</p>
                  <div className="text-2xl font-bold text-text-primary">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: account.currency }).format(account.initialBalance)}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Hesap Düzenle" : "Yeni Hesap Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Hesap Adı" 
            placeholder="Örn: Garanti Maaş Hesabı" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Hesap Türü"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              options={[
                { value: 'BANK_ACCOUNT', label: 'Banka Hesabı' },
                { value: 'CREDIT_CARD', label: 'Kredi Kartı' },
                { value: 'CASH', label: 'Nakit Kasa' },
                { value: 'INVESTMENT', label: 'Yatırım' },
              ]}
            />
            <Select 
              label="Para Birimi"
              value={formData.currency}
              onChange={(e) => setFormData({...formData, currency: e.target.value})}
              options={[
                { value: 'TRY', label: 'TL (₺)' },
                { value: 'USD', label: 'Dolar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'GLD', label: 'Altın (gr)' },
              ]}
            />
          </div>
          {formData.type === 'BANK_ACCOUNT' || formData.type === 'CREDIT_CARD' ? (
            <Input 
              label="Banka Adı (Opsiyonel)" 
              placeholder="Örn: Garanti BBVA" 
              value={formData.bankName}
              onChange={(e) => setFormData({...formData, bankName: e.target.value})}
            />
          ) : null}
          <Input 
            label="Açılış Bakiyesi" 
            type="number"
            step="0.01"
            value={formData.balance}
            onChange={(e) => setFormData({...formData, balance: e.target.value})}
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
