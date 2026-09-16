'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Plus, Edit2, Trash2, Calendar, Repeat, BellRing, BellOff } from 'lucide-react';
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
    if (daysLeft < 0) return { text: 'Gecikti', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (daysLeft === 0) return { text: 'Bugün', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (daysLeft <= 7) return { text: `${daysLeft} gün kaldı`, color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { text: `${daysLeft} gün kaldı`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
  const inactiveSubscriptions = subscriptions.filter(s => s.status !== 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Abonelikler</h1>
          <p className="text-text-muted mt-1">Düzenli ödemelerinizi ve dijital aboneliklerinizi takip edin.</p>
        </div>
        <Button onClick={() => { setEditingSub(null); setIsModalOpen(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Abonelik Ekle
        </Button>
      </div>

      <SubscriptionSummaryBar subscriptions={subscriptions} />

      {loading ? (
        <div className="text-center py-12 text-text-muted">Yükleniyor...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 bg-bg-card rounded-3xl border border-border">
          <Repeat className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Henüz Abonelik Yok</h3>
          <p className="text-text-muted mb-6">Netflix, Spotify, spor salonu gibi düzenli ödemelerinizi ekleyin.</p>
          <Button onClick={() => { setEditingSub(null); setIsModalOpen(true); }}>İlk Aboneliği Ekle</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Subscriptions */}
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Aktif Abonelikler ({activeSubscriptions.length})
            </h2>
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-bg-sidebar/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-text-secondary">Abonelik Adı</th>
                      <th className="px-4 py-3 font-semibold text-text-secondary">Plan / Sıklık</th>
                      <th className="px-4 py-3 font-semibold text-text-secondary text-right">Tutar</th>
                      <th className="px-4 py-3 font-semibold text-text-secondary">Sonraki Ödeme</th>
                      <th className="px-4 py-3 font-semibold text-text-secondary text-center">Hatırlatıcı</th>
                      <th className="px-4 py-3 font-semibold text-text-secondary text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeSubscriptions.map(sub => {
                      const daysInfo = getDaysLeftText(sub.nextPaymentDate);
                      const isMonthly = sub.frequency === 'MONTHLY';
                      
                      return (
                        <tr key={sub.id} className="group hover:bg-bg-sidebar/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-xs font-bold text-text-primary uppercase border border-border group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                                {sub.name.substring(0, 2)}
                              </div>
                              <div className="font-medium text-text-primary">{sub.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                              {isMonthly ? 'Aylık Plan' : `${sub.frequency} Plan`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-text-primary">
                            {formatCurrency(sub.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {sub.nextPaymentDate ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${daysInfo.bg} ${daysInfo.color}`}>
                                  {daysInfo.text}
                                </span>
                                <span className="text-text-muted text-xs">
                                  {format(new Date(sub.nextPaymentDate), 'd MMM yyyy', { locale: tr })}
                                </span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub.reminderEnabled ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <BellRing className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  {sub.remindBeforeDays || 3} gün önce
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-secondary">
                                <BellOff className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-[11px] font-medium text-text-muted">Kapalı</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingSub(sub); setIsModalOpen(true); }} className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors" title="Düzenle">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(sub.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors" title="Sil">
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

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2 opacity-60">
                <span className="w-2 h-2 rounded-full bg-text-muted"></span>
                Durdurulan Abonelikler ({inactiveSubscriptions.length})
              </h2>
              <div className="bg-bg-card rounded-2xl border border-border overflow-hidden opacity-60 grayscale hover:grayscale-0 transition-all">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-bg-sidebar/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-text-secondary">Abonelik Adı</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary">Plan / Sıklık</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary text-right">Tutar</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inactiveSubscriptions.map(sub => (
                        <tr key={sub.id} className="group hover:bg-bg-sidebar/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-xs font-bold text-text-primary uppercase border border-border">
                                {sub.name.substring(0, 2)}
                              </div>
                              <div className="font-medium text-text-primary">{sub.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                              {sub.frequency === 'MONTHLY' ? 'Aylık Plan' : `${sub.frequency} Plan`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-text-primary">
                            {formatCurrency(sub.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingSub(sub); setIsModalOpen(true); }} className="p-1.5 rounded-lg bg-bg-secondary text-text-muted hover:text-blue-500 transition-colors" title="Düzenle">
                                <Edit2 className="w-4 h-4" />
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

      {isModalOpen && (
        <SubscriptionModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingSub(null); }}
          onSuccess={loadData}
          subscription={editingSub}
        />
      )}
    </div>
  );
}
