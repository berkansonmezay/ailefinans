'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { 
  Plus, 
  Wallet, 
  Building2, 
  CreditCard, 
  Edit2, 
  Trash2, 
  User, 
  List, 
  HelpCircle, 
  Search, 
  Sparkles, 
  Banknote 
} from 'lucide-react';
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

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function AccountsPage() {
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH'>('ALL');

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
      const res = await fetchApi<any>('/accounts?pageSize=100');
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
    const ok = await confirm({
      title: 'Hesabı Sil',
      message: 'Bu hesabı silmek istediğinize emin misiniz? Hesaba bağlı geçmiş işlemler korunacaktır.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
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

  // Metric breakdowns
  const stats = useMemo(() => {
    let totalBalance = 0;
    let bankTotal = 0;
    let bankCount = 0;
    let creditCardTotal = 0;
    let creditCardCount = 0;
    let cashTotal = 0;
    let cashCount = 0;

    accounts.forEach(acc => {
      const b = acc.currentBalance ?? acc.initialBalance ?? 0;
      totalBalance += b;

      if (acc.type === 'BANK_ACCOUNT' || acc.type === 'INVESTMENT') {
        bankTotal += b;
        bankCount++;
      } else if (acc.type === 'CREDIT_CARD') {
        creditCardTotal += b;
        creditCardCount++;
      } else if (acc.type === 'CASH') {
        cashTotal += b;
        cashCount++;
      }
    });

    return {
      totalBalance,
      bankTotal,
      bankCount,
      creditCardTotal,
      creditCardCount,
      cashTotal,
      cashCount,
    };
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesSearch = 
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.ownerName && acc.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (acc.institution && acc.institution.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = 
        typeFilter === 'ALL' ? true :
        acc.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [accounts, searchQuery, typeFilter]);

  // Group filtered accounts by owner
  const groupedAccounts = useMemo(() => {
    return filteredAccounts.reduce((acc, account) => {
      const owner = account.ownerName || 'Ortak / Diğer';
      if (!acc[owner]) acc[owner] = [];
      acc[owner].push(account);
      return acc;
    }, {} as Record<string, Account[]>);
  }, [filteredAccounts]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Hesaplarım
            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className="text-text-muted hover:text-emerald-400 transition-colors p-1 rounded-lg"
              title="Bilgilendirme ve Açıklamalar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">
            Aile bireylerinin banka, kredi kartı ve nakit varlık hesaplarını tek merkezden yönetin.
          </p>
        </div>
        <Button onClick={openNewModal} className="px-4 py-2 text-sm shadow-sm gap-2">
          <Plus className="w-4 h-4" />
          Yeni Hesap Ekle
        </Button>
      </div>

      {/* 4 Reference KPI Cards (Taksitli Alacaklar Stili) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. TOPLAM AİLE VARLIĞI (Zümrüt) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              TOPLAM AİLE VARLIĞI
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight truncate">
              {formatCurrency(stats.totalBalance)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {accounts.length} aktif hesap
            </div>
          </div>
        </div>

        {/* 2. BANKA HESAPLARI (Mavi) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              BANKA & MEVDUAT
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-tight truncate">
              {formatCurrency(stats.bankTotal)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.bankCount} mevduat hesabı
            </div>
          </div>
        </div>

        {/* 3. KREDİ KARTLARI (Kırmızı / Gül) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-rose-500">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              KREDİ KARTLARI
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-500 tracking-tight leading-tight truncate">
              {formatCurrency(stats.creditCardTotal)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.creditCardCount} kart bakiyesi
            </div>
          </div>
        </div>

        {/* 4. NAKİT KASA (Amber) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              NAKİT KASA
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-500 tracking-tight leading-tight truncate">
              {formatCurrency(stats.cashTotal)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.cashCount} nakit kasa
            </div>
          </div>
        </div>
      </div>

      {/* Bilgilendirme & Durum Banner'ı */}
      <div className="rounded-2xl p-4 border transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-400">
              Aile Varlık Durumu Dengeli
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Tüm hesaplarınızdaki toplam nakit ve mevduat varlığınız <strong>{formatCurrency(stats.totalBalance)}</strong> seviyesindedir. Gelir ve gider işlemleriniz ilgili hesap bakiyelerine otomatik olarak yansıtılmaktadır.
            </p>
          </div>
          <button
            onClick={() => setShowInfoGuide(!showInfoGuide)}
            className="text-xs font-semibold underline text-text-muted hover:text-text-primary transition-colors flex-shrink-0 pt-0.5"
          >
            {showInfoGuide ? 'Rehberi Gizle' : 'Nasıl Hesaplanır?'}
          </button>
        </div>

        {/* Rehber Açıklama Kutuları */}
        {showInfoGuide && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-text-secondary">
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-emerald-400 block mb-1">1. Toplam Varlık</span>
              Tanımlanmış tüm nakit kasa, banka hesapları ve kart bakiyelerinin cebirsel toplamıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-blue-400 block mb-1">2. Güncel Bakiye</span>
              Hesabın açılış bakiyesine bu hesaba giren gelirler eklenip, çıkan giderler düşülerek anlık hesaplanır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-rose-400 block mb-1">3. Kredi Kartları</span>
              Kredi kartı üzerinden yapılan harcamalar ve kart ödemeleri sonucundaki net borç veya alacak durumudur.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-amber-400 block mb-1">4. Kişi Bazlı Dağılım</span>
              Hesaplar aile bireylerine göre gruplanarak her bireyin toplam varlığı ayrı ayrı gösterilir.
            </div>
          </div>
        )}
      </div>

      {/* Arama ve Filtre Toolbar'ı */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input 
            type="text" 
            placeholder="Hesap adı, banka veya kişi ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'BANK_ACCOUNT', label: 'Banka' },
            { id: 'CREDIT_CARD', label: 'Kredi Kartı' },
            { id: 'CASH', label: 'Nakit' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                typeFilter === f.id
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hesap Grupları ve Tablolar */}
      {loading ? (
        <div className="text-center py-16 bg-bg-card rounded-2xl border border-border text-text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          Hesaplar yükleniyor...
        </div>
      ) : Object.keys(groupedAccounts).length === 0 ? (
        <div className="text-center py-16 bg-bg-card rounded-2xl border border-border shadow-sm">
          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-2">Henüz Kayıtlı Hesap Yok</h3>
          <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">
            Mevduat ve nakit varlıklarınızı takip etmek için ilk hesabınızı ekleyin.
          </p>
          <Button onClick={openNewModal} className="shadow-sm">Hesap Ekle</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAccounts).map(([owner, ownerAccounts]) => {
            const ownerTotal = ownerAccounts.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.initialBalance ?? 0), 0);
            
            return (
              <div key={owner} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-lg font-bold text-text-primary">{owner}</h2>
                  </div>
                  <div className="text-xs font-medium text-text-muted">
                    Toplam Varlık: <span className="text-text-primary font-bold text-sm ml-1">{formatCurrency(ownerTotal)}</span>
                  </div>
                </div>

                <div className="bg-bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-bg-sidebar border-b border-border text-text-secondary">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Hesap Adı</th>
                          <th className="px-5 py-3 font-semibold">Hesap Türü</th>
                          <th className="px-5 py-3 font-semibold">Banka / Kurum</th>
                          <th className="px-5 py-3 font-semibold text-right">Güncel Bakiye</th>
                          <th className="px-5 py-3 font-semibold text-center">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ownerAccounts.map((account) => {
                          const TypeIcon = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.icon || Wallet;
                          const typeLabel = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.label || account.type;
                          const balance = account.currentBalance ?? account.initialBalance ?? 0;
                          
                          return (
                            <tr key={account.id} className="hover:bg-bg-sidebar/50 transition-colors group">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 group-hover:scale-105 transition-transform">
                                    <TypeIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-text-primary text-sm">{account.name}</div>
                                    <div className="text-xs text-text-muted">{account.currency} Hesabı</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-text-secondary text-sm">
                                {account.institution || '-'}
                              </td>
                              <td className="px-5 py-3.5 text-right font-black text-text-primary text-base">
                                {formatCurrency(balance, account.currency)}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedAccountForTx({ id: account.id, name: account.name });
                                      setIsTxModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-text-primary transition-colors border border-border"
                                    title="İşlem Geçmişi"
                                  >
                                    <List className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(account)}
                                    className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors border border-border"
                                    title="Düzenle"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(account.id)}
                                    className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-rose-500 transition-colors border border-border"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

      {/* Hesap Ekle / Düzenle Modalı */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Hesap Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="örn: Garanti Maaş, Ziraat Vadeli, Cüzdan"
              required
            />
            
            <Input
              label="Hesap Sahibi (Aile Bireyi)"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              placeholder="örn: Ahmet, Ayşe, Ortak"
            />

            <Select
              label="Hesap Türü"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'BANK_ACCOUNT', label: 'Banka Hesabı' },
                { value: 'CREDIT_CARD', label: 'Kredi Kartı' },
                { value: 'CASH', label: 'Nakit Kasa' },
                { value: 'INVESTMENT', label: 'Yatırım Hesabı' },
              ]}
            />

            <Input
              label="Banka / Kurum Adı"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="örn: Garanti BBVA, İş Bankası"
            />

            <Input
              label="Başlangıç Bakiyesi"
              type="number"
              step="any"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
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
                { value: 'GBP', label: 'GBP (£)' },
              ]}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit">
                {editingId ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Hesap İşlemleri Modalı */}
      {isTxModalOpen && selectedAccountForTx && (
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
