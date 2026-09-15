'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, Wallet, Building2, CreditCard, Edit2, Trash2, User, List } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AccountTransactionsModal } from '@/components/accounts/AccountTransactionsModal';

interface Account {
  id: string;
  name: string;
  type: string;
  ownerName?: string;
  initialBalance: number;
  currentBalance: number;
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
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedAccountForTx, setSelectedAccountForTx] = useState<{id: string, name: string} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
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
    setFormData({ name: '', ownerName: '', type: 'BANK_ACCOUNT', balance: '0', currency: 'TRY', bankName: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      ownerName: account.ownerName || '',
      type: account.type,
      balance: account.initialBalance.toString(),
      currency: account.currency,
      bankName: account.institution || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz? (İşlemler silinmeyebilir)')) return;
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
        ownerName: formData.ownerName || null,
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

  const totalBalance = accounts.reduce((acc, account) => acc + (account.currentBalance ?? account.initialBalance ?? 0), 0);

  const groupedAccounts = accounts.reduce((acc, account) => {
    const owner = account.ownerName || 'Ortak / Diğer';
    if (!acc[owner]) acc[owner] = [];
    acc[owner].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Banka ve Mevduat Hesapları</h1>
          <p className="text-text-muted mt-1">Aile bireylerinin banka, kredi kartı ve nakit hesaplarını yönetin.</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-5 h-5 mr-2" />
          Yeni Hesap Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-5">
            <div className="text-emerald-400 text-sm font-medium mb-1">Toplam Aile Varlığı (TRY)</div>
            <div className="text-3xl font-bold text-text-primary">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Yükleniyor...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 bg-bg-card rounded-3xl border border-border">
          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Henüz hesap yok</h3>
          <p className="text-text-muted mb-6">Mevduatlarınızı takip etmek için ilk hesabınızı ekleyin.</p>
          <Button onClick={() => setIsModalOpen(true)}>Hesap Ekle</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedAccounts).map(([owner, ownerAccounts]) => {
            const ownerTotal = ownerAccounts.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.initialBalance ?? 0), 0);
            
            return (
              <div key={owner} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-text-muted" />
                    <h2 className="text-xl font-bold text-text-primary">{owner}</h2>
                  </div>
                  <div className="text-sm font-medium text-text-muted">
                    Toplam: <span className="text-text-primary font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ownerTotal)}</span>
                  </div>
                </div>

                <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-bg-sidebar/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-text-secondary">Hesap Adı</th>
                          <th className="px-4 py-3 font-semibold text-text-secondary">Hesap Türü</th>
                          <th className="px-4 py-3 font-semibold text-text-secondary text-right">Bakiye</th>
                          <th className="px-4 py-3 font-semibold text-text-secondary text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ownerAccounts.map((account) => {
                          const TypeIcon = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.icon || Wallet;
                          const typeLabel = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.label || account.type;
                          const balance = account.currentBalance ?? account.initialBalance ?? 0;
                          
                          return (
                            <tr key={account.id} className="group hover:bg-bg-sidebar/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-bg-secondary text-text-muted rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-colors">
                                    <TypeIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-text-primary">{account.name}</div>
                                    <div className="text-xs text-text-muted">{account.institution || '-'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-text-primary">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: account.currency }).format(balance)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setSelectedAccountForTx({ id: account.id, name: account.name }); setIsTxModalOpen(true); }} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors" title="İşlemler (Hesap Geçmişi)">
                                    <List className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleEdit(account)} className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors" title="Düzenle">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(account.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors" title="Sil">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Hesap Düzenle" : "Yeni Hesap Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Hesap Sahibi (Aile Bireyi)" 
            placeholder="Örn: Ahmet, Ayşe veya Boş bırakın" 
            value={formData.ownerName}
            onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
          />
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
          {formData.type === 'BANK_ACCOUNT' || formData.type === 'CREDIT_CARD' || formData.type === 'INVESTMENT' ? (
            <Input 
              label="Banka Adı (Opsiyonel)" 
              placeholder="Örn: Garanti BBVA" 
              value={formData.bankName}
              onChange={(e) => setFormData({...formData, bankName: e.target.value})}
            />
          ) : null}
          <Input 
            label={editingId ? "Başlangıç Bakiyesi" : "Açılış Bakiyesi"} 
            type="number"
            step="0.01"
            value={formData.balance}
            onChange={(e) => setFormData({...formData, balance: e.target.value})}
            required
          />
          {editingId && (
            <p className="text-xs text-text-muted mt-1">Not: Anlık bakiye gelir/gider hareketlerinize göre otomatik hesaplanır. Bu sadece ilk açılış bakiyesidir.</p>
          )}
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

      {selectedAccountForTx && (
        <AccountTransactionsModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          accountId={selectedAccountForTx.id}
          accountName={selectedAccountForTx.name}
          onUpdate={loadAccounts}
        />
      )}
    </div>
  );
}
