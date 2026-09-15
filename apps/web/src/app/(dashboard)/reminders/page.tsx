'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BellRing, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Repeat,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  currency: string;
  dueDate: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  status: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'TRY',
    dueDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurrenceRule: 'MONTHLY'
  });

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<Reminder[]>('/reminders');
      setReminders(data || []);
    } catch (err: any) {
      console.error('Error fetching reminders:', err);
      toast.error(err.message || 'Hatırlatıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [reminders, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await fetchApi(`/reminders/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || undefined,
            amount: formData.amount ? Number(formData.amount) : undefined,
            currency: formData.currency,
            dueDate: new Date(formData.dueDate).toISOString(),
            isRecurring: formData.isRecurring,
            recurrenceRule: formData.isRecurring ? formData.recurrenceRule : undefined
          })
        });
        toast.success('Hatırlatıcı başarıyla güncellendi');
      } else {
        await fetchApi('/reminders', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || undefined,
            amount: formData.amount ? Number(formData.amount) : undefined,
            currency: formData.currency,
            dueDate: new Date(formData.dueDate).toISOString(),
            isRecurring: formData.isRecurring,
            recurrenceRule: formData.isRecurring ? formData.recurrenceRule : undefined
          })
        });
        toast.success('Hatırlatıcı başarıyla eklendi');
      }
      
      setIsModalOpen(false);
      setEditId(null);
      fetchReminders();
      setFormData({
        title: '', description: '', amount: '', currency: 'TRY',
        dueDate: new Date().toISOString().split('T')[0],
        isRecurring: false, recurrenceRule: 'MONTHLY'
      });
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Hatırlatıcı kaydedilemedi');
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      title: '', description: '', amount: '', currency: 'TRY',
      dueDate: new Date().toISOString().split('T')[0],
      isRecurring: false, recurrenceRule: 'MONTHLY'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditId(reminder.id);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      amount: reminder.amount ? reminder.amount.toString() : '',
      currency: reminder.currency,
      dueDate: new Date(reminder.dueDate).toISOString().split('T')[0],
      isRecurring: reminder.isRecurring,
      recurrenceRule: reminder.recurrenceRule || 'MONTHLY'
    });
    setIsModalOpen(true);
  };

  const handleComplete = async (id: string) => {
    try {
      await fetchApi(`/reminders/${id}/complete`, { method: 'POST' });
      toast.success('Hatırlatıcı durumu güncellendi');
      fetchReminders();
    } catch (err: any) {
      console.error('Complete error:', err);
      toast.error(err.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu hatırlatıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/reminders/${id}`, { method: 'DELETE' });
      toast.success('Hatırlatıcı silindi');
      fetchReminders();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Hatırlatıcı silinemedi');
    }
  };

  const getStatusColor = (dueDateStr: string, status: string) => {
    if (status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (status === 'CANCELLED') return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-rose-500/10 text-rose-500 border-rose-500/20'; // Overdue
    if (diffDays <= 3) return 'bg-amber-500/10 text-amber-500 border-amber-500/20'; // Due soon
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20'; // Future
  };

  const getStatusText = (dueDateStr: string, status: string) => {
    if (status === 'COMPLETED') return 'Tamamlandı';
    if (status === 'CANCELLED') return 'İptal';
    
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} Gün Gecikti`;
    if (diffDays === 0) return 'Bugün';
    return `${diffDays} Gün Kaldı`;
  };

  const formatCurrency = (val: number, cur: string) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur }).format(val);
  };

  const activeCount = reminders.filter(r => r.status === 'ACTIVE').length;
  const overdueCount = reminders.filter(r => r.status === 'ACTIVE' && new Date(r.dueDate) < new Date()).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Hatırlatıcılar
          </h1>
          <p className="text-text-muted mt-1">Gelecek ödemelerinizi ve önemli tarihlerinizi takip edin.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Yeni Hatırlatıcı
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-500">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <BellRing className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">Aktif Hatırlatıcılar</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-500 truncate">{activeCount} Adet</div>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-rose-500">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">Gecikmiş</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-500 truncate">{overdueCount} Adet</div>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">Tamamlanan</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-500 truncate">
              {reminders.filter(r => r.status === 'COMPLETED').length} Adet
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Hatırlatıcı Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={openAddModal}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 px-5 py-2 rounded-xl text-sm font-medium hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ekle</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="text-center py-12 bg-bg-card border border-border rounded-2xl">
          <BellRing className="w-12 h-12 mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-1">Hatırlatıcı Bulunamadı</h3>
          <p className="text-text-muted text-sm">Arama kriterlerinize uygun veya henüz kayıtlı bir hatırlatıcı yok.</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-screen/50 text-text-muted">
                <tr>
                  <th className="px-6 py-4 font-medium">Durum</th>
                  <th className="px-6 py-4 font-medium">Başlık & Açıklama</th>
                  <th className="px-6 py-4 font-medium">Tutar</th>
                  <th className="px-6 py-4 font-medium">Tarih</th>
                  <th className="px-6 py-4 font-medium">Tekrar</th>
                  <th className="px-6 py-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReminders.map(reminder => (
                  <tr key={reminder.id} className={`hover:bg-bg-screen/30 transition-colors ${reminder.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
                    <td className="px-6 py-4">
                      <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(reminder.dueDate, reminder.status)}`}>
                        {getStatusText(reminder.dueDate, reminder.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[300px]">
                      <div className="font-bold text-text-primary truncate" title={reminder.title}>{reminder.title}</div>
                      {reminder.description && (
                        <div className="text-xs text-text-muted truncate mt-0.5" title={reminder.description}>{reminder.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {reminder.amount ? (
                        <span className="font-medium text-text-primary">{formatCurrency(reminder.amount, reminder.currency)}</span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-text-primary">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{new Date(reminder.dueDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {reminder.isRecurring ? (
                        <div className="flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-medium text-text-primary">
                            {reminder.recurrenceRule === 'DAILY' ? 'Günlük' :
                             reminder.recurrenceRule === 'WEEKLY' ? 'Haftalık' :
                             reminder.recurrenceRule === 'MONTHLY' ? 'Aylık' :
                             reminder.recurrenceRule === 'YEARLY' ? 'Yıllık' : reminder.recurrenceRule}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {reminder.status === 'ACTIVE' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleComplete(reminder.id)}
                            className="p-1.5 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors text-text-muted"
                            title={reminder.isRecurring ? 'Sonrakine Geç' : 'Tamamlandı İşaretle'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(reminder)}
                            className="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors text-text-muted"
                            title="Düzenle"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors text-text-muted"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-screen/30">
              <h2 className="text-lg font-bold text-text-primary">{editId ? 'Hatırlatıcıyı Düzenle' : 'Yeni Hatırlatıcı Ekle'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditId(null); }} className="text-text-muted hover:text-text-primary p-1 rounded-lg transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Başlık *</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  className="w-full bg-bg-screen border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="Örn: Ev Kirası, Kredi Kartı..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Açıklama (İsteğe bağlı)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  className="w-full bg-bg-screen border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Tutar (Opsiyonel)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData(p => ({...p, amount: e.target.value}))}
                    className="w-full bg-bg-screen border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Tarih *</label>
                  <input
                    required
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))}
                    className="w-full bg-bg-screen border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={e => setFormData(p => ({...p, isRecurring: e.target.checked}))}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-text-primary select-none cursor-pointer">
                  Bu hatırlatıcı düzenli olarak tekrarlansın
                </label>
              </div>

              {formData.isRecurring && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Tekrar Sıklığı</label>
                  <select
                    value={formData.recurrenceRule}
                    onChange={e => setFormData(p => ({...p, recurrenceRule: e.target.value}))}
                    className="w-full bg-bg-screen border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  >
                    <option value="DAILY">Her Gün</option>
                    <option value="WEEKLY">Her Hafta</option>
                    <option value="MONTHLY">Her Ay</option>
                    <option value="YEARLY">Her Yıl</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-bg-screen hover:bg-bg-hover text-text-primary px-4 py-2.5 rounded-xl font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] px-4 py-2.5 rounded-xl font-medium transition-all"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
