'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  CreditCard, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  User, 
  Tag, 
  Search,
  AlertTriangle,
  Coins,
  PieChart,
  Info,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ReceivablesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filtering & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'PAID'>('ALL');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  // Form data for new installment receivable
  const [formData, setFormData] = useState({
    description: '',
    debtorName: '',
    categoryId: '',
    accountId: '',
    totalAmount: '',
    installmentCount: '3',
    firstPaymentDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [recRes, accRes, catRes] = await Promise.all([
        fetchApi<any>('/receivables'),
        fetchApi<any>('/accounts').catch(() => []),
        fetchApi<any>('/categories').catch(() => []),
      ]);

      const recList = Array.isArray(recRes) ? recRes : (recRes.items || recRes.data || []);
      setItems(recList);
      setAccounts(Array.isArray(accRes) ? accRes : (accRes.items || accRes.data || []));
      
      const rawCats = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      setCategories(rawCats.filter((c: any) => c.type === 'INCOME'));

      const initialExpanded: Record<string, boolean> = {};
      recList.forEach((item: any) => {
        initialExpanded[item.id] = true;
      });
      setExpandedPlans(initialExpanded);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedPlans(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleCollected = async (inst: any) => {
    try {
      const isCurrentlyCollected = inst.status === 'PAID';
      const newRecurrenceRule = isCurrentlyCollected ? null : 'COLLECTED';
      
      await fetchApi(`/incomes/${inst.id}`, {
        method: 'PUT',
        body: JSON.stringify({ recurrenceRule: newRecurrenceRule }),
      });

      toast.success(isCurrentlyCollected ? 'Tahsilat iptal edildi' : 'Taksit tahsil edildi olarak işaretlendi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Güncellenirken bir hata oluştu');
    }
  };

  const handleDeletePlan = async (item: any) => {
    if (!confirm(`"${item.description || item.debtorName}" taksitli alacak kaydını ve tüm taksitlerini silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await fetchApi(`/receivables/${item.id}`, { method: 'DELETE' });
      toast.success('Taksitli alacak kaydı başarıyla silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken bir hata oluştu');
    }
  };

  const handleDeleteInstallment = async (installment: any) => {
    if (!confirm(`${installment.number}. taksiti silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await fetchApi(`/incomes/${installment.id}`, { method: 'DELETE' });
      toast.success('Taksit başarıyla silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken bir hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(formData.totalAmount);
      const count = parseInt(formData.installmentCount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return toast.error('Lütfen geçerli bir toplam tutar girin');
      }
      if (isNaN(count) || count < 2) {
        return toast.error('Taksit sayısı en az 2 olmalıdır');
      }

      const installmentAmount = parsedAmount / count;
      const planId = Math.random().toString(36).substring(2, 15);

      // Create installment incomes
      for (let i = 0; i < count; i++) {
        const instDate = new Date(formData.firstPaymentDate);
        instDate.setMonth(instDate.getMonth() + i);

        const desc = formData.description?.trim() 
          ? `${formData.description.trim()} (${i + 1}. Taksit / ${count})` 
          : `Taksit ${i + 1}/${count}`;

        const payload = {
          amount: installmentAmount,
          transactionDate: instDate.toISOString(),
          description: desc,
          categoryId: formData.categoryId || null,
          source: formData.debtorName || null,
          accountId: formData.accountId || null,
          parentId: planId,
        };

        await fetchApi('/incomes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      toast.success(`${count} taksitli alacak kaydı başarıyla oluşturuldu`);
      setIsModalOpen(false);
      setFormData({
        description: '',
        debtorName: '',
        categoryId: '',
        accountId: '',
        totalAmount: '',
        installmentCount: '3',
        firstPaymentDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Kayıt oluşturulurken hata oluştu');
    }
  };

  // Extract all individual installments across all plans for exact KPI calculation
  const allInstallments = useMemo(() => {
    const list: any[] = [];
    items.forEach(item => {
      if (Array.isArray(item.installments)) {
        item.installments.forEach((inst: any) => {
          list.push({ ...inst, parentPlan: item });
        });
      }
    });
    return list;
  }, [items]);

  // Statistics calculation strictly matching user's reference cards
  const stats = useMemo(() => {
    const now = new Date();
    
    let totalAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let collectedAmount = 0;

    let totalInstallmentsCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let collectedCount = 0;
    let totalOverdueDays = 0;

    // Calculate from installments if available, otherwise from plan summaries
    if (allInstallments.length > 0) {
      totalInstallmentsCount = allInstallments.length;

      allInstallments.forEach(inst => {
        const amt = Number(inst.amount) || 0;
        totalAmount += amt;

        if (inst.status === 'PAID') {
          collectedAmount += amt;
          collectedCount++;
        } else {
          const dueDate = new Date(inst.dueDate);
          if (dueDate < now) {
            // Overdue
            overdueAmount += amt;
            overdueCount++;
            const diffDays = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            totalOverdueDays += diffDays;
          } else {
            // Pending
            pendingAmount += amt;
            pendingCount++;
          }
        }
      });
    } else {
      // Fallback from plans
      items.forEach(item => {
        const total = Number(item.totalAmount) || Number(item.amount) || 0;
        const paid = Number(item.paidAmount) || 0;
        const remaining = Number(item.remainingAmount) || Math.max(0, total - paid);

        totalAmount += total;
        collectedAmount += paid;
        pendingAmount += remaining;
        totalInstallmentsCount += (item.installmentCount || 1);
      });
    }

    const performanceRate = totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0;
    const overdueAvgDays = overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0;

    return {
      totalAmount,
      totalInstallmentsCount,
      pendingAmount,
      pendingCount,
      overdueAmount,
      overdueCount,
      overdueAvgDays,
      collectedAmount,
      collectedCount,
      performanceRate,
    };
  }, [items, allInstallments]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.debtorName && item.debtorName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const isPaid = item.status === 'PAID' || item.remainingAmount <= 0;
      const hasOverdue = Array.isArray(item.installments) && item.installments.some((i: any) => i.status === 'OVERDUE');

      const matchesStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? !isPaid :
        statusFilter === 'OVERDUE' ? hasOverdue :
        isPaid;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const formatCurrency = (val: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            Taksitli Alacaklar
            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className="text-text-muted hover:text-emerald-400 transition-colors p-1 rounded-lg"
              title="Bilgilendirme ve Açıklamalar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">Taksitli alacaklarınızı, tahsilat durumlarını ve performansınızı takip edin.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        </div>
      </div>

      {/* 5 Reference KPI Cards (TOPLAM TUTAR, BEKLEYEN, GECİKMİŞ, TAHSİL EDİLEN, PERFORMANS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. TOPLAM TUTAR (Blue) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              TOPLAM TUTAR
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-tight truncate">
              {formatCurrency(stats.totalAmount)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.totalInstallmentsCount} taksit
            </div>
          </div>
        </div>

        {/* 2. BEKLEYEN (Orange / Amber) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              BEKLEYEN
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-500 tracking-tight leading-tight truncate">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.pendingCount} taksit
            </div>
          </div>
        </div>

        {/* 3. GECİKMİŞ (Red) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-rose-500">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              GECİKMİŞ
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-500 tracking-tight leading-tight truncate">
              {formatCurrency(stats.overdueAmount)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5 truncate">
              {stats.overdueCount} taksit {stats.overdueAvgDays > 0 ? `· ort. ${stats.overdueAvgDays} gün` : ''}
            </div>
          </div>
        </div>

        {/* 4. TAHSİL EDİLEN (Green / Emerald) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              TAHSİL EDİLEN
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight truncate">
              {formatCurrency(stats.collectedAmount)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.collectedCount} taksit
            </div>
          </div>
        </div>

        {/* 5. PERFORMANS (Purple) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <PieChart className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              PERFORMANS
            </span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight leading-tight">
              %{stats.performanceRate}
            </div>
            <div className="text-xs text-emerald-500 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-0.5">
              <span>↑ Tahsilat Oranı</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bilgilendirme Kutusu (Info Alert & Guidance) */}
      <div className={`rounded-2xl p-4 border transition-all ${
        stats.overdueCount > 0 
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            stats.overdueCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {stats.overdueCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-bold ${stats.overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {stats.overdueCount > 0 ? 'Gecikmiş Alacak Hatırlatması' : 'Taksitli Alacak Durumu İyi'}
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {stats.overdueCount > 0 ? (
                <>
                  Şu anda vadesi geçmiş toplam <strong>{stats.overdueCount} taksit</strong> ({formatCurrency(stats.overdueAmount)}) bulunmaktadır (ortalama gecikme: <strong>{stats.overdueAvgDays} gün</strong>). İlgili kişi veya kurumlara tahsilat hatırlatması yapılması önerilir.
                </>
              ) : (
                <>
                  Tebrikler! Vadesi geçmiş herhangi bir taksitli alacağınız bulunmamaktadır. Önümüzdeki vadelerde toplam <strong>{formatCurrency(stats.pendingAmount)}</strong> tutarında <strong>{stats.pendingCount} taksit</strong> tahsilatı beklenmektedir.
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

        {/* Detailed Explanation / Bilgilendirme Rehberi */}
        {showInfoGuide && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-text-secondary">
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-blue-400 block mb-1">1. Toplam Tutar</span>
              Tanımlanmış tüm taksitli alacak planlarının toplam anapara tutarıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-amber-400 block mb-1">2. Bekleyen Taksitler</span>
              Vade tarihi henüz gelmemiş ve gelecekte tahsil edilecek planlanmış taksitlerdir.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-rose-400 block mb-1">3. Gecikmiş Taksitler</span>
              Vade tarihi geçmiş olmasına rağmen henüz tahsil edildi olarak işaretlenmemiş alacaklardır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-emerald-400 block mb-1">4. Tahsil Edilen & Performans</span>
              Tahsilatı tamamlanan taksitlerin toplam tutarını ve portföyün başarı oranını (% olarak) gösterir.
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Açıklama veya borçlu kişi/kurum ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'ALL' ? 'bg-emerald-500 text-white font-bold' : 'bg-bg-secondary text-text-muted hover:text-text-primary'
            }`}
          >
            Tümü ({items.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white font-bold' : 'bg-bg-secondary text-text-muted hover:text-text-primary'
            }`}
          >
            Aktif Planlar
          </button>
          <button
            onClick={() => setStatusFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'OVERDUE' ? 'bg-rose-600 text-white font-bold' : 'bg-bg-secondary text-text-muted hover:text-rose-400'
            }`}
          >
            Gecikenler {stats.overdueCount > 0 && `(${stats.overdueCount})`}
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'PAID' ? 'bg-emerald-500 text-white font-bold' : 'bg-bg-secondary text-text-muted hover:text-text-primary'
            }`}
          >
            Tamamlananlar
          </button>
        </div>
      </div>

      {/* Installment Plans List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 bg-bg-card rounded-3xl border border-border text-text-muted">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            Taksitli alacaklar yükleniyor...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-bg-card rounded-3xl border border-border">
            <Wallet className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Henüz taksitli alacak kaydı yok</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
              Gelir eklerken "Taksitli İşlem" seçeneğini kullanarak taksitli alacak planları oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedPlans[item.id] !== false;
            const installments = item.installments || [];
            const count = item.installmentCount || installments.length || 1;
            const paidCount = installments.filter((i: any) => i.status === 'PAID').length;
            const isCompleted = item.status === 'PAID' || (item.remainingAmount || 0) <= 0;
            const progressPercent = Math.min(100, Math.round((paidCount / count) * 100));

            return (
              <div 
                key={item.id} 
                className="bg-bg-card border border-border hover:border-emerald-500/30 rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                {/* Plan Header */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-text-primary">
                          {item.description || item.debtorName}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isCompleted 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}>
                          {isCompleted ? 'Tamamlandı' : 'Aktif Plan'}
                        </span>
                        {item.category && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-secondary text-text-muted border border-border flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {item.category.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted mt-1">
                        {item.debtorName && (
                          <span className="flex items-center gap-1 text-text-secondary">
                            <User className="w-3.5 h-3.5" />
                            {item.debtorName}
                          </span>
                        )}
                        <span>Toplam: <strong className="text-text-primary">{count} Taksit</strong></span>
                        {item.givenDate && (
                          <span>Başlangıç: {formatDate(item.givenDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics & Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                    <div className="text-left lg:text-right">
                      <div className="text-xs text-text-muted">Kalan Alacak</div>
                      <div className="text-xl font-bold text-amber-400">
                        {formatCurrency(item.remainingAmount, item.currency)}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        Toplam: <span className="font-semibold text-text-primary">{formatCurrency(item.totalAmount || item.amount, item.currency)}</span>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <div className="text-xs text-text-muted">Aylık Taksit</div>
                      <div className="text-lg font-bold text-text-primary">
                        {formatCurrency(item.installmentAmount, item.currency)}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {paidCount} / {count} taksit tahsil edildi
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-2 rounded-xl bg-bg-secondary hover:bg-slate-700/50 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 text-xs font-medium"
                        title="Taksitleri Göster/Gizle"
                      >
                        {isExpanded ? (
                          <>
                            <span>Gizle</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>Taksitler ({installments.length})</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeletePlan(item)}
                        className="p-2 rounded-xl bg-bg-secondary hover:bg-rose-500/20 text-text-muted hover:text-rose-400 transition-colors"
                        title="Taksitli Alacak Planını Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 pb-3">
                  <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-text-muted mt-1.5">
                    <span>İlerleme: %{progressPercent}</span>
                    <span>{paidCount} tahsil edildi, {count - paidCount} kalan</span>
                  </div>
                </div>

                {/* Installments Breakdown ("Taksitler Halinde") */}
                {isExpanded && (
                  <div className="border-t border-border bg-bg-secondary/40 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-emerald-400" />
                        Tahsilat Takvimi ve Taksit Planı ({installments.length} Taksit)
                      </h4>
                    </div>

                    {installments.length === 0 ? (
                      <div className="text-sm text-text-muted py-2">
                        Henüz ayrıntılı taksit dökümü oluşturulmamış.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-xs text-text-muted border-b border-border/60">
                              <th className="pb-2 font-medium">Taksit No</th>
                              <th className="pb-2 font-medium">Vade Tarihi</th>
                              <th className="pb-2 font-medium">Tutar</th>
                              <th className="pb-2 font-medium">Durum</th>
                              <th className="pb-2 font-medium text-right">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {installments.map((inst: any) => {
                              const isPaid = inst.status === 'PAID';
                              const isOverdue = inst.status === 'OVERDUE';
                              const instDate = new Date(inst.dueDate);
                              const now = new Date();
                              const diffDays = Math.ceil((instDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              const isDueSoon = !isPaid && !isOverdue && diffDays >= 0 && diffDays <= 7;

                              return (
                                <tr key={inst.id} className="hover:bg-bg-card/50 transition-colors">
                                  <td className="py-2.5 font-semibold text-text-primary">
                                    {inst.number}. Taksit
                                    {inst.description && inst.description !== `Taksit ${inst.number}/${count}` && (
                                      <span className="text-xs font-normal text-text-muted ml-2">
                                        ({inst.description})
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-text-secondary">
                                    {formatDate(inst.dueDate)}
                                  </td>
                                  <td className="py-2.5 font-bold text-text-primary">
                                    {formatCurrency(inst.amount, item.currency)}
                                  </td>
                                  <td className="py-2.5">
                                    {isPaid ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Tahsil Edildi
                                      </span>
                                    ) : isOverdue ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                        <AlertTriangle className="w-3 h-3" />
                                        Gecikmiş ({Math.abs(diffDays)} gün)
                                      </span>
                                    ) : isDueSoon ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                        <Clock className="w-3 h-3" />
                                        {diffDays === 0 ? 'Bugün Vadesi Geldi' : `${diffDays} gün kaldı`}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/30 text-text-muted">
                                        <Calendar className="w-3 h-3" />
                                        Gelecek Taksit
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {item.sourceType === 'INCOME_TRANSACTION' && (
                                        <button
                                          onClick={() => handleToggleCollected(inst)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                            isPaid 
                                              ? 'bg-bg-secondary text-text-muted hover:text-amber-400 hover:bg-amber-500/10' 
                                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                          }`}
                                          title={isPaid ? 'Tahsilatı iptal et' : 'Tahsil edildi olarak işaretle'}
                                        >
                                          {isPaid ? 'Geri Al' : '✓ Tahsil Et'}
                                        </button>
                                      )}
                                      
                                      {item.sourceType === 'INCOME_TRANSACTION' && (
                                        <button
                                          onClick={() => handleDeleteInstallment(inst)}
                                          className="p-1 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                          title="Bu taksiti sil"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Yeni Taksitli Alacak Ekle */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yeni Taksitli Alacak Ekle"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Açıklama"
            placeholder="Örn: Danışmanlık Ücreti, Borç Tahsilatı, Satış Geliri"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Borçlu Kişi / Kurum"
              placeholder="Örn: Ahmet Yılmaz, ABC Ltd."
              value={formData.debtorName}
              onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
              required
            />

            <Select
              label="Kategori"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={[
                { value: '', label: 'Kategori Seçiniz' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Toplam Alacak Tutarı (TL)"
              type="number"
              step="0.01"
              placeholder="Örn: 15000"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Taksit Sayısı
              </label>
              <select
                value={formData.installmentCount}
                onChange={(e) => setFormData({ ...formData, installmentCount: e.target.value })}
                className="w-full bg-bg-card border border-slate-700 rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {[2, 3, 4, 5, 6, 8, 9, 10, 12, 18, 24, 36].map((num) => (
                  <option key={num} value={num}>{num} Taksit</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly preview */}
          {formData.totalAmount && parseFloat(formData.totalAmount) > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400 flex items-center justify-between">
              <span>Aylık Tahsilat Tutarı:</span>
              <span className="font-bold text-base">
                {formatCurrency(parseFloat(formData.totalAmount) / parseInt(formData.installmentCount || '2'))} / ay
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="İlk Tahsilat Tarihi"
              type="date"
              value={formData.firstPaymentDate}
              onChange={(e) => setFormData({ ...formData, firstPaymentDate: e.target.value })}
              required
            />

            <Select
              label="İlişkili Hesap (Opsiyonel)"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              options={[
                { value: '', label: 'Hesap Seçiniz' },
                ...accounts.map(a => ({ value: a.id, label: a.name }))
              ]}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              İptal
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
              Taksitli Alacağı Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
