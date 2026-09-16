'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Repeat, 
  BellRing, 
  BellOff, 
  HelpCircle, 
  Search, 
  Sparkles, 
  Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SubscriptionSummaryBar } from '@/components/subscriptions/SubscriptionSummaryBar';
import { SubscriptionModal } from '@/components/subscriptions/SubscriptionModal';

export default function SubscriptionsPage() {
  const { confirm } = useConfirm();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/subscriptions');
      setSubscriptions(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error('Abonelikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Aboneliği Sil',
      message: 'Bu abonelik kaydını silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await fetchApi(`/subscriptions/${id}`, { method: 'DELETE' });
      toast.success('Abonelik silindi');
      loadData();
    } catch (error: any) {
      toast.error('Silinirken hata oluştu');
    }
  };

  const getDaysLeftText = (nextPaymentDate: string) => {
    if (!nextPaymentDate) return { text: 'Belirsiz', color: 'text-text-muted', bg: 'bg-bg-secondary' };
    const daysLeft = differenceInDays(new Date(nextPaymentDate), new Date());
    if (daysLeft < 0) return { text: 'Gecikti', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
    if (daysLeft === 0) return { text: 'Bugün', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (daysLeft <= 7) return { text: `${daysLeft} gün kaldı`, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { text: `${daysLeft} gün kaldı`, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  };

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isActive = s.status === 'ACTIVE';
      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? isActive :
        !isActive;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  const activeSubscriptions = filteredSubscriptions.filter(s => s.status === 'ACTIVE');
  const inactiveSubscriptions = filteredSubscriptions.filter(s => s.status !== 'ACTIVE');

  // Calculate upcoming in 7 days
  const upcomingThisWeek = activeSubscriptions.filter(s => {
    if (!s.nextPaymentDate) return false;
    const d = differenceInDays(new Date(s.nextPaymentDate), new Date());
    return d >= 0 && d <= 7;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Abonelikler
            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className="text-text-muted hover:text-emerald-400 transition-colors p-1 rounded-lg"
              title="Bilgilendirme ve Açıklamalar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">
            Düzenli yenilenen dijital aboneliklerinizi, lisanslarınızı ve fatura vadelerinizi takip edin.
          </p>
        </div>
        <Button onClick={() => { setEditingSub(null); setIsModalOpen(true); }} className="px-4 py-2 text-sm shadow-sm gap-2">
          <Plus className="w-4 h-4" />
          Abonelik Ekle
        </Button>
      </div>

      {/* 4 Reference KPI Cards */}
      <SubscriptionSummaryBar subscriptions={subscriptions} />

      {/* Bilgilendirme & Durum Banner'ı */}
      <div className="rounded-2xl p-4 border transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-500/20 text-emerald-400">
            {upcomingThisWeek.length > 0 ? <Clock className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-400">
              {upcomingThisWeek.length > 0 ? 'Yaklaşan Abonelik Ödemeleri Var' : 'Abonelik Durumu Düzenli'}
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {upcomingThisWeek.length > 0 ? (
                <>
                  Önümüzdeki 7 gün içinde yenilenecek toplam <strong>{upcomingThisWeek.length} adet aboneliğiniz</strong> bulunmaktadır. Hesap bakiyenizin yeterli olduğundan emin olunuz.
                </>
              ) : (
                <>
                  Şu anda önümüzdeki hafta içinde tahsil edilecek acil bir abonelik yenilemeniz bulunmuyor. Toplam <strong>{activeSubscriptions.length} aktif abonelik</strong> takip edilmektedir.
                </>
              )}
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
              <span className="font-bold text-blue-400 block mb-1">1. Aylık Toplam Gider</span>
              Haftalık, aylık ve yıllık tüm aboneliklerin bir aya denk gelen normalize edilmiş maliyetidir.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-purple-400 block mb-1">2. Yıllık Projeksiyon</span>
              Mevcut aktif aboneliklerinizin 12 ay boyunca devam etmesi halinde yıllık bütçenizden çıkacak tutardır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-emerald-400 block mb-1">3. Aktif Hizmetler</span>
              Düzenli ödemesi devam eden dijital platform, üyelik ve aboneliklerin toplam sayısıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-amber-400 block mb-1">4. Vade Hatırlatması</span>
              Yenileme tarihinden önce sistem otomatik hatırlatıcı göndererek beklenmeyen çekimleri engeller.
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
            placeholder="Abonelik adı (örn. Netflix, Spotify) ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'ACTIVE', label: 'Aktif Olanlar' },
            { id: 'INACTIVE', label: 'Durdurulanlar' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                statusFilter === f.id
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Abonelik Tabloları */}
      {loading ? (
        <div className="text-center py-16 bg-bg-card rounded-2xl border border-border text-text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          Abonelikler yükleniyor...
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-16 bg-bg-card rounded-2xl border border-border shadow-sm">
          <Repeat className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-2">Henüz Abonelik Yok</h3>
          <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">
            Netflix, Spotify, spor salonu veya bulut depolama gibi düzenli ödemelerinizi ekleyin.
          </p>
          <Button onClick={() => { setEditingSub(null); setIsModalOpen(true); }} className="shadow-sm">İlk Aboneliği Ekle</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Subscriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Aktif Abonelikler ({activeSubscriptions.length})
              </h2>
            </div>
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-bg-sidebar border-b border-border text-text-secondary">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Abonelik Adı</th>
                      <th className="px-5 py-3 font-semibold">Plan / Sıklık</th>
                      <th className="px-5 py-3 font-semibold text-right">Tutar</th>
                      <th className="px-5 py-3 font-semibold">Sonraki Ödeme</th>
                      <th className="px-5 py-3 font-semibold text-center">Hatırlatıcı</th>
                      <th className="px-5 py-3 font-semibold text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                          Filtreye uygun aktif abonelik bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      activeSubscriptions.map(sub => {
                        const daysInfo = getDaysLeftText(sub.nextPaymentDate);
                        const isMonthly = sub.frequency === 'MONTHLY';
                        
                        return (
                          <tr key={sub.id} className="hover:bg-bg-sidebar/50 transition-colors group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs font-bold uppercase border border-purple-500/20 group-hover:scale-105 transition-transform">
                                  {sub.name.substring(0, 2)}
                                </div>
                                <div className="font-bold text-text-primary text-sm">{sub.name}</div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                                {isMonthly ? 'Aylık Plan' : `${sub.frequency} Plan`}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-text-primary text-base">
                              {formatCurrency(sub.amount)}
                            </td>
                            <td className="px-5 py-3.5">
                              {sub.nextPaymentDate ? (
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${daysInfo.bg} ${daysInfo.color}`}>
                                    {daysInfo.text}
                                  </span>
                                  <span className="text-text-muted text-xs">
                                    {format(new Date(sub.nextPaymentDate), 'd MMM yyyy', { locale: tr })}
                                  </span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {sub.reminderEnabled ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                  <BellRing className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    {sub.remindBeforeDays || 3} gün önce
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-secondary border border-border">
                                  <BellOff className="w-3.5 h-3.5 text-text-muted" />
                                  <span className="text-[11px] font-medium text-text-muted">Kapalı</span>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => { setEditingSub(sub); setIsModalOpen(true); }} 
                                  className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors border border-border" 
                                  title="Düzenle"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(sub.id)} 
                                  className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-rose-500 transition-colors border border-border" 
                                  title="Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-text-muted flex items-center gap-2 opacity-75">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  Durdurulan Abonelikler ({inactiveSubscriptions.length})
                </h2>
              </div>
              <div className="bg-bg-card rounded-2xl border border-border overflow-hidden opacity-75 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-bg-sidebar border-b border-border text-text-secondary">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Abonelik Adı</th>
                        <th className="px-5 py-3 font-semibold">Plan / Sıklık</th>
                        <th className="px-5 py-3 font-semibold text-right">Tutar</th>
                        <th className="px-5 py-3 font-semibold text-center">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inactiveSubscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-bg-sidebar/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center text-xs font-bold text-text-muted uppercase border border-border">
                                {sub.name.substring(0, 2)}
                              </div>
                              <div className="font-medium text-text-secondary">{sub.name}</div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-bg-sidebar text-text-muted border border-border">
                              {sub.frequency === 'MONTHLY' ? 'Aylık Plan' : `${sub.frequency} Plan`}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-text-secondary">
                            {formatCurrency(sub.amount)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => { setEditingSub(sub); setIsModalOpen(true); }} className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors border border-border" title="Düzenle">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(sub.id)} className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-rose-500 transition-colors border border-border" title="Sil">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Abonelik Ekle / Düzenle Modalı */}
      {isModalOpen && (
        <SubscriptionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadData}
          subscription={editingSub}
        />
      )}
    </div>
  );
}
