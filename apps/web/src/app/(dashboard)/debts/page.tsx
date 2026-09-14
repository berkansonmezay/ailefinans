'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Wallet, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Building2, 
  Tag, 
  Search,
  AlertCircle,
  AlertTriangle,
  Layers,
  Coins,
  PieChart,
  HelpCircle,
  Sparkles,
  Info,
  ArrowRight,
  RefreshCw,
  List,
  LayoutList,
  Filter,
  LayoutGrid,
  Bell
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { QuickAddModal } from '@/components/shared/QuickAddModal';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function DebtsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showInfoGuide, setShowInfoGuide] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  
  // Partial Payment State
  const [partialPayment, setPartialPayment] = useState<{ debtId: string, instId: string, amount: number, remaining: number, description: string } | null>(null);
  
  // Filtering & search
  const [filters, setFilters] = useState({
    search: '',
    vade: '',
    status: 'ALL' as 'ALL' | 'ACTIVE' | 'OVERDUE' | 'PAID',
    categoryId: 'Tümü',
    merchantId: 'Tümü',
    startDate: '',
    endDate: ''
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'plan' | 'list'>('plan');

  // Form data for new installment debt
  const [formData, setFormData] = useState({
    description: '',
    creditor: '',
    merchantId: '',
    categoryId: '',
    accountId: '',
    totalAmount: '',
    installmentCount: '3',
    firstPaymentDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [debtsRes, accRes, catRes, merRes] = await Promise.all([
        fetchApi<any>('/debts'),
        fetchApi<any>('/accounts').catch(() => []),
        fetchApi<any>('/categories').catch(() => []),
        fetchApi<any>('/merchants').catch(() => []),
      ]);

      const debtList = Array.isArray(debtsRes) ? debtsRes : (debtsRes.items || debtsRes.data || []);
      setItems(debtList);
      setAccounts(Array.isArray(accRes) ? accRes : (accRes.items || accRes.data || []));
      
      const rawCats = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      setCategories(rawCats.filter((c: any) => c.type === 'EXPENSE'));
      
      setMerchants(Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []));

      // Removed initialExpanded reset to prevent auto-collapse on refresh
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

  const handleDeletePlan = async (item: any) => {
    if (!confirm(`"${item.description || item.creditor}" taksitli borç kaydını ve tüm taksitlerini silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await fetchApi(`/debts/${item.id}`, { method: 'DELETE' });
      toast.success('Taksitli borç kaydı başarıyla silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken bir hata oluştu');
    }
  };

  const handleToggleReminder = async (item: any) => {
    try {
      setLoading(true);
      await fetchApi(`/debts/${item.id}/reminder`, {
        method: 'PATCH',
        body: JSON.stringify({ status: !item.hasReminder })
      });
      toast.success(
        !item.hasReminder 
          ? 'Hatırlatıcı başarıyla aktifleştirildi.' 
          : 'Hatırlatıcı başarıyla kapatıldı.'
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Hatırlatıcı durumu değiştirilemedi.');
      setLoading(false);
    }
  };

  const handleDeleteInstallment = async (installment: any) => {
    if (!confirm(`${installment.number || installment.installmentNumber || ''}. taksiti silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await fetchApi(`/expenses/${installment.id}`, { method: 'DELETE' });
      toast.success('Taksit başarıyla silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken bir hata oluştu');
    }
  };

  const handleTogglePaid = async (debtId: string, inst: any) => {
    try {
      const isCurrentlyPaid = inst.status === 'PAID';
      
      if (isCurrentlyPaid) {
        // Unpay
        await fetchApi(`/debts/${debtId}/installments/${inst.id}/unpay`, { method: 'POST' });
        toast.success('Ödeme iptal edildi');
      } else {
        // Pay remaining fully
        const remaining = inst.amount - (inst.paidAmount || 0);
        await fetchApi(`/debts/${debtId}/installments/${inst.id}/pay`, {
          method: 'POST',
          body: JSON.stringify({ amount: remaining }),
        });
        toast.success('Taksit ödendi olarak işaretlendi');
      }

      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Güncellenirken bir hata oluştu');
    }
  };

  const handlePartialPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialPayment) return;
    
    if (partialPayment.amount <= 0 || partialPayment.amount > partialPayment.remaining) {
      toast.error('Geçersiz tutar girdiniz.');
      return;
    }

    try {
      await fetchApi(`/debts/${partialPayment.debtId}/installments/${partialPayment.instId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount: partialPayment.amount }),
      });
      toast.success('Kısmi ödeme başarıyla alındı.');
      setPartialPayment(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Ödeme alınırken bir hata oluştu.');
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

      if (editingPlan) {
        await fetchApi(`/debts/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            description: formData.description,
            categoryId: formData.categoryId || null,
            accountId: formData.accountId || null,
            creditor: formData.creditor,
          }),
        });
        toast.success('Taksitli işlem başarıyla güncellendi');
      } else {
        const installmentAmount = parsedAmount / count;
        const planId = Math.random().toString(36).substring(2, 15);
        const selectedMerchant = merchants.find(m => m.id === formData.merchantId);
        const creditorName = selectedMerchant ? selectedMerchant.name : formData.creditor;

        // Create installment expenses
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
            merchantId: formData.merchantId || null,
            accountId: formData.accountId || null,
            installmentPlanId: planId,
          };

          await fetchApi('/expenses', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
        toast.success(`${count} taksitli borç kaydı başarıyla oluşturuldu`);
      }

      setIsModalOpen(false);
      setEditingPlan(null);
      setFormData({
        description: '',
        creditor: '',
        merchantId: '',
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

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      description: '',
      creditor: '',
      merchantId: '',
      categoryId: '',
      accountId: '',
      totalAmount: '',
      installmentCount: '3',
      firstPaymentDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingPlan(item);
    setFormData({
      description: item.description || '',
      creditor: item.creditor || item.merchantName || '',
      merchantId: item.installments[0]?.merchantId || '',
      categoryId: item.category?.id || '',
      accountId: item.installments[0]?.accountId || '',
      totalAmount: item.totalAmount.toString(),
      installmentCount: item.installmentCount.toString(),
      firstPaymentDate: item.firstPaymentDate ? item.firstPaymentDate.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        (item.description && item.description.toLowerCase().includes(filters.search.toLowerCase())) ||
        (item.creditor && item.creditor.toLowerCase().includes(filters.search.toLowerCase())) ||
        (item.merchantName && item.merchantName.toLowerCase().includes(filters.search.toLowerCase()));

      const hasOverdue = Array.isArray(item.installments) && item.installments.some((i: any) =>
        i.status !== 'PAID' && new Date(i.dueDate) < new Date()
      );
      
      const matchesStatus = 
        filters.status === 'ALL' ? true :
        filters.status === 'ACTIVE' ? item.status === 'ACTIVE' :
        filters.status === 'OVERDUE' ? hasOverdue :
        item.status === 'PAID';

      if (filters.categoryId !== 'Tümü' && item.categoryId !== filters.categoryId) {
        return false;
      }
      if (filters.merchantId !== 'Tümü' && item.merchantId !== filters.merchantId) {
        return false;
      }

      const hasInstallmentInDateRange = Array.isArray(item.installments) && item.installments.some((i: any) => {
        if (!filters.vade && !filters.startDate && !filters.endDate) return true;
        
        const txTime = new Date(i.dueDate).getTime();
        const txDate = new Date(i.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = today.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (filters.vade) {
          if (filters.vade === 'Bugün') {
             if (txTime < startOfToday || txTime >= startOfToday + oneDayMs) return false;
          } else if (filters.vade === 'Bu Hafta') {
             const startOfWeek = startOfToday - (today.getDay() * oneDayMs);
             if (txTime < startOfWeek) return false;
          } else if (filters.vade === 'Bu Ay') {
             if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
          } else if (filters.vade === 'Geçen Ay') {
             const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
             const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
             if (txDate.getMonth() !== lastMonth || txDate.getFullYear() !== lastMonthYear) return false;
          } else if (filters.vade === '15 Gün') {
             if (txTime < startOfToday - (15 * oneDayMs)) return false;
          } else if (filters.vade === 'Geçmiş') {
             if (txTime >= startOfToday) return false;
          } else if (filters.vade === 'Geçen 3 Ay') {
             const threeMonthsAgo = new Date(today);
             threeMonthsAgo.setMonth(today.getMonth() - 3);
             if (txTime < threeMonthsAgo.getTime()) return false;
          } else if (filters.vade === 'Gelecek 3 Ay') {
             const nextThreeMonths = new Date(today);
             nextThreeMonths.setMonth(today.getMonth() + 3);
             if (txTime > nextThreeMonths.getTime()) return false;
          }
        }

        if (filters.startDate) {
          const start = new Date(filters.startDate).getTime();
          if (txTime < start) return false;
        }
        if (filters.endDate) {
          const endObj = new Date(filters.endDate);
          endObj.setHours(23, 59, 59, 999);
          const end = endObj.getTime();
          if (txTime > end) return false;
        }
        
        return true;
      });

      return matchesSearch && matchesStatus && hasInstallmentInDateRange;
    });
  }, [items, filters]);

  // Extract all individual installments across all filtered plans for exact KPI / list view calculation
  const allInstallments = useMemo(() => {
    const list: any[] = [];
    filteredItems.forEach(item => {
      if (Array.isArray(item.installments)) {
        item.installments.forEach((inst: any) => {
          if (!filters.vade && !filters.startDate && !filters.endDate) {
            list.push({ 
              ...inst, 
              planName: item.description || item.creditor, 
              planId: item.id, 
              currency: item.currency 
            });
            return;
          }
          
          const txTime = new Date(inst.dueDate).getTime();
          const txDate = new Date(inst.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOfToday = today.getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          let isValid = true;

          if (filters.vade) {
            if (filters.vade === 'Bugün') {
               if (txTime < startOfToday || txTime >= startOfToday + oneDayMs) isValid = false;
            } else if (filters.vade === 'Bu Hafta') {
               const startOfWeek = startOfToday - (today.getDay() * oneDayMs);
               if (txTime < startOfWeek) isValid = false;
            } else if (filters.vade === 'Bu Ay') {
               if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) isValid = false;
            } else if (filters.vade === 'Geçen Ay') {
               const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
               const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
               if (txDate.getMonth() !== lastMonth || txDate.getFullYear() !== lastMonthYear) isValid = false;
            } else if (filters.vade === '15 Gün') {
               if (txTime < startOfToday - (15 * oneDayMs)) isValid = false;
            } else if (filters.vade === 'Geçmiş') {
               if (txTime >= startOfToday) isValid = false;
            } else if (filters.vade === 'Geçen 3 Ay') {
               const threeMonthsAgo = new Date(today);
               threeMonthsAgo.setMonth(today.getMonth() - 3);
               if (txTime < threeMonthsAgo.getTime()) isValid = false;
            } else if (filters.vade === 'Gelecek 3 Ay') {
               const nextThreeMonths = new Date(today);
               nextThreeMonths.setMonth(today.getMonth() + 3);
               if (txTime > nextThreeMonths.getTime()) isValid = false;
            }
          }

          if (filters.startDate) {
            const start = new Date(filters.startDate).getTime();
            if (txTime < start) isValid = false;
          }
          if (filters.endDate) {
            const endObj = new Date(filters.endDate);
            endObj.setHours(23, 59, 59, 999);
            const end = endObj.getTime();
            if (txTime > end) isValid = false;
          }
          
          if (isValid) {
            list.push({ 
              ...inst, 
              planName: item.description || item.creditor, 
              planId: item.id, 
              currency: item.currency 
            });
          }
        });
      }
    });
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [filteredItems, filters]);

  // Switch to list view when filters are applied
  useEffect(() => {
    const isFiltered = filters.search || filters.vade || filters.status !== 'ALL' || filters.categoryId !== 'Tümü' || filters.merchantId !== 'Tümü' || filters.startDate || filters.endDate;
    if (isFiltered) {
      setViewMode('list');
    } else {
      setViewMode('plan');
    }
  }, [filters]);

  // Statistics calculation matching 5-card reference
  const stats = useMemo(() => {
    const now = new Date();
    let totalAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let paidAmount = 0;

    let totalInstallmentsCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;
    let totalOverdueDays = 0;

    if (allInstallments.length > 0) {
      totalInstallmentsCount = allInstallments.length;

      allInstallments.forEach(inst => {
        const amt = Number(inst.amount) || 0;
        totalAmount += amt;

        if (inst.status === 'PAID') {
          paidAmount += amt;
          paidCount++;
        } else {
          const dueDate = new Date(inst.dueDate);
          if (dueDate < now) {
            overdueAmount += amt;
            overdueCount++;
            const diffDays = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            totalOverdueDays += diffDays;
          } else {
            pendingAmount += amt;
            pendingCount++;
          }
        }
      });
    } else {
      items.forEach(item => {
        const total = Number(item.totalAmount) || Number(item.principalAmount) || 0;
        const paid = Number(item.paidAmount) || 0;
        const remaining = Number(item.remainingAmount) || Math.max(0, total - paid);

        totalAmount += total;
        paidAmount += paid;
        pendingAmount += remaining;
        totalInstallmentsCount += (item.installmentCount || 1);
      });
    }

    const performanceRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
    const overdueAvgDays = overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0;

    return {
      totalAmount,
      totalInstallmentsCount,
      pendingAmount,
      pendingCount,
      overdueAmount,
      overdueCount,
      overdueAvgDays,
      paidAmount,
      paidCount,
      performanceRate,
    };
  }, [items, allInstallments]);

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
            Taksitli Borçlar
            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className="text-text-muted hover:text-emerald-400 transition-colors p-1 rounded-lg"
              title="Bilgilendirme ve Açıklamalar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-text-muted mt-1">Taksitli borçlarınızı ve ödeme planlarını taksitler halinde takip edin.</p>
        </div>


      </div>

      {/* 5 Reference KPI Cards (TOPLAM TUTAR, BEKLEYEN, GECİKMİŞ, ÖDENEN, PERFORMANS) */}
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

        {/* 2. BEKLEYEN (Amber) */}
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
            <AlertCircle className="w-6 h-6" />
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

        {/* 4. ÖDENEN (Green) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              ÖDENEN
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight truncate">
              {formatCurrency(stats.paidAmount)}
            </div>
            <div className="text-xs text-slate-400 dark:text-text-muted mt-0.5">
              {stats.paidCount} taksit
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
              <span>↑ Ödeme Oranı</span>
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
              {stats.overdueCount > 0 ? 'Gecikmiş Borç Hatırlatması' : 'Taksitli Borç Durumu İyi'}
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {stats.overdueCount > 0 ? (
                <>
                  Şu anda vadesi geçmiş toplam <strong>{stats.overdueCount} taksit</strong> ({formatCurrency(stats.overdueAmount)}) bulunmaktadır (ortalama gecikme: <strong>{stats.overdueAvgDays} gün</strong>). Bu ödemeleri en kısa sürede tamamlamanız tavsiye edilir.
                </>
              ) : (
                <>
                  Tebrikler! Vadesi geçmiş herhangi bir taksitli borcunuz bulunmamaktadır. Önümüzdeki vadelerde toplam <strong>{formatCurrency(stats.pendingAmount)}</strong> tutarında <strong>{stats.pendingCount} taksit</strong> ödemesi beklenmektedir.
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
              Tanımlanmış tüm taksitli borç planlarının toplam anapara tutarıdır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-amber-400 block mb-1">2. Bekleyen Taksitler</span>
              Vade tarihi henüz gelmemiş ve gelecekte ödenmesi gereken planlanmış taksitlerdir.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-rose-400 block mb-1">3. Gecikmiş Taksitler</span>
              Vade tarihi geçmiş olmasına rağmen henüz ödendi olarak işaretlenmemiş borçlardır.
            </div>
            <div className="bg-bg-card/70 p-3 rounded-xl border border-border">
              <span className="font-bold text-emerald-400 block mb-1">4. Ödenen & Performans</span>
              Ödemesi tamamlanan taksitlerin toplam tutarını ve portföyün başarı oranını (% olarak) gösterir.
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Açıklama veya mağaza/kurum ara..." 
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          
          <div className="relative">
            <Button 
              variant="secondary" 
              className={`px-3 h-10 transition-colors ${isFiltersOpen ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-bg-secondary border-border'}`}
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreler
              {(filters.vade || filters.status !== 'ALL' || filters.categoryId !== 'Tümü' || filters.merchantId !== 'Tümü' || filters.startDate || filters.endDate) && (
                <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </Button>
            
            {isFiltersOpen && (
              <div className="absolute left-0 lg:left-0 top-full mt-2 w-[320px] sm:w-[360px] bg-bg-card border border-border rounded-xl shadow-2xl z-50 p-5">
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider">VADE</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-3">
                    {['Geçmiş', 'Geçen Ay', 'Geçen 3 Ay', 'Geçen Çeyrek', 'Bugün', 'Bu Hafta', 'Bu Ay', 'Bu Çeyrek', '15 Gün', 'Gelecek 3 Ay'].map(vade => (
                      <button 
                        key={vade} 
                        onClick={() => setFilters(f => ({ ...f, vade: f.vade === vade ? '' : vade }))}
                        className={`text-[15px] transition-colors text-left ${filters.vade === vade ? 'text-emerald-500 font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        {vade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider">DURUM</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-3">
                    {[
                      { id: 'ALL', label: 'Tümü' },
                      { id: 'ACTIVE', label: 'Aktif Planlar' },
                      { id: 'OVERDUE', label: 'Gecikenler' },
                      { id: 'PAID', label: 'Tamamlananlar' }
                    ].map(status => (
                      <button 
                        key={status.id} 
                        onClick={() => setFilters(f => ({ ...f, status: status.id as any }))}
                        className={`text-[15px] transition-colors text-left ${filters.status === status.id ? 'text-emerald-500 font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-2 uppercase tracking-wider">KATEGORİ</div>
                  <select 
                    value={filters.categoryId}
                    onChange={(e) => setFilters(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="Tümü">Tümü</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-2 uppercase tracking-wider">HARCAMA YERİ</div>
                  <select 
                    value={filters.merchantId}
                    onChange={(e) => setFilters(f => ({ ...f, merchantId: e.target.value }))}
                    className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="Tümü">Tümü</option>
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="h-px bg-border my-4 -mx-5"></div>

                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center text-sm font-medium text-text-primary hover:text-emerald-500 transition-colors w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Gelişmiş Filtreler
                </button>

                {showAdvancedFilters && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-border">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase tracking-wider">Başlangıç Tarihi</label>
                      <input 
                        type="date" 
                        value={filters.startDate}
                        onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                        className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase tracking-wider">Bitiş Tarihi</label>
                      <input 
                        type="date" 
                        value={filters.endDate}
                        onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => {
                      setFilters({ search: '', vade: '', status: 'ALL', categoryId: 'Tümü', merchantId: 'Tümü', startDate: '', endDate: '' });
                      setShowAdvancedFilters(false);
                      setIsFiltersOpen(false);
                    }}
                    className="text-xs text-text-muted hover:text-rose-500 font-medium transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center bg-bg-secondary p-1 rounded-lg">
          <button
            onClick={() => setViewMode('plan')}
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'plan' ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            title="Plan Görünümü (Gruplanmış)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            title="Liste Görünümü (Tarihe Göre Sıralı)"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Installment Plans List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 bg-bg-card rounded-3xl border border-border text-text-muted">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            Taksitli borçlar yükleniyor...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-bg-card rounded-3xl border border-border">
            <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Henüz taksitli borç kaydı yok</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
              Harcama yaparken "Taksitli İşlem" seçeneğini kullanarak taksit planları ekleyebilirsiniz.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-bg-sidebar border-b border-border text-text-secondary">
                      <th className="px-5 py-3 font-semibold">Taksit Planı</th>
                      <th className="px-5 py-3 font-semibold">Taksit No</th>
                      <th className="px-5 py-3 font-semibold">Vade Tarihi</th>
                      <th className="px-5 py-3 font-semibold">Tutar</th>
                      <th className="px-5 py-3 font-semibold">Durum</th>
                      <th className="px-5 py-3 font-semibold text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allInstallments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                          Gösterilecek taksit bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      allInstallments.map((inst: any) => {
                        const isPaid = inst.status === 'PAID';
                        const instDate = new Date(inst.dueDate);
                        const now = new Date();
                        const diffDays = Math.ceil((instDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isOverdue = !isPaid && diffDays < 0;
                        const isDueSoon = !isPaid && !isOverdue && diffDays >= 0 && diffDays <= 7;

                        return (
                          <tr key={inst.id} className="hover:bg-bg-sidebar/50 transition-colors">
                            <td className="px-5 py-3 font-medium text-text-primary">
                              {inst.planName}
                            </td>
                            <td className="px-5 py-3 font-semibold text-text-primary">
                              {inst.number}. Taksit
                            </td>
                            <td className="px-5 py-3">
                              <div className={`flex items-center gap-1.5 ${
                                isOverdue ? 'text-rose-500 font-bold' : 
                                isDueSoon ? 'text-amber-500 font-bold' : 'text-text-secondary'
                              }`}>
                                <CalendarDays className="w-3.5 h-3.5" />
                                {formatDate(inst.dueDate)}
                              </div>
                              {isOverdue && (
                                <div className="text-[10px] text-rose-500 mt-0.5">
                                  {Math.abs(diffDays)} gün gecikti
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-text-primary">
                              <div className="flex flex-col items-end">
                                <span>{formatCurrency(inst.amount, inst.currency)}</span>
                                {(inst.paidAmount || 0) > 0 && (inst.paidAmount || 0) < inst.amount && (
                                  <span className="text-[10px] text-emerald-500 font-medium mt-0.5">
                                    {formatCurrency(inst.paidAmount, inst.currency)} Ödendi
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {isPaid ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 w-fit">
                                    <CheckCircle2 size={12} /> Ödendi
                                  </span>
                                  {inst.paidDate && (
                                    <span className="text-[10px] text-text-muted">{formatDate(inst.paidDate)}</span>
                                  )}
                                </div>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-500 w-fit">
                                  <AlertCircle size={12} /> Gecikmiş
                                </span>
                              ) : isDueSoon ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 w-fit">
                                  <Clock size={12} /> Yaklaşıyor
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-500/10 text-slate-500 w-fit">
                                  Bekliyor
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isPaid && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Find the parent plan to toggle reminder for the whole plan
                                      const parentPlan = filteredItems.find(p => p.id === inst.planId);
                                      if (parentPlan) handleToggleReminder(parentPlan);
                                    }}
                                    className={`px-2 py-1.5 rounded-lg transition-colors border flex items-center justify-center ${
                                      (() => {
                                        const parentPlan = filteredItems.find(p => p.id === inst.planId);
                                        return parentPlan?.hasReminder
                                          ? 'border-blue-500/30 text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white'
                                          : 'border-border text-text-secondary hover:border-blue-500/30 hover:text-blue-500'
                                      })()
                                    }`}
                                    title="Tüm plan için hatırlatıcıyı aç/kapat"
                                  >
                                    <Bell className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleTogglePaid(inst.planId, inst)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    isPaid 
                                      ? 'border-border text-text-secondary hover:bg-bg-sidebar hover:text-text-primary' 
                                      : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white'
                                  }`}
                                  title={isPaid ? 'Ödemeyi iptal et' : 'Kalan tutarın tamamını öde'}
                                >
                                  {isPaid ? 'Geri Al' : '✓ Öde'}
                                </button>

                                {!isPaid && inst.sourceType === 'DEBT' && (
                                  <button
                                    onClick={() => setPartialPayment({
                                      debtId: inst.planId,
                                      instId: inst.id,
                                      remaining: inst.amount - (inst.paidAmount || 0),
                                      amount: inst.amount - (inst.paidAmount || 0),
                                      description: `${inst.planName} - ${inst.number}. Taksit Kısmi Ödemesi`
                                    })}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-secondary border border-border text-text-primary hover:bg-bg-hover hover:border-emerald-500/30 transition-all"
                                    title="Taksitin bir kısmını öde"
                                  >
                                    Kısmi Öde
                                  </button>
                                )}
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
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedPlans[item.id] === true;
            const installments = item.installments || [];
            const count = item.installmentCount || installments.length || 1;
            const paidCount = installments.filter((i: any) => i.status === 'PAID').length;
            const progressPercent = Math.min(100, Math.round((paidCount / count) * 100));

            return (
              <div 
                key={item.id} 
                className="bg-bg-card border border-border hover:border-emerald-500/30 rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                {/* Plan Header & Progress (Clickable) */}
                <div 
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-bg-sidebar/30 transition-colors"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-text-primary">
                          {item.description || item.creditor}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status === 'PAID' 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status === 'PAID' ? 'Tamamlandı' : 'Aktif Plan'}
                        </span>
                        {item.category && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-secondary text-text-muted border border-border flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {item.category.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted mt-1">
                        {item.creditor && (
                          <span className="flex items-center gap-1 text-text-secondary">
                            <Building2 className="w-3.5 h-3.5" />
                            {item.creditor}
                          </span>
                        )}
                        <span>Toplam: <strong className="text-text-primary">{count} Taksit</strong></span>
                        {item.startDate && (
                          <span>Başlangıç: {formatDate(item.startDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics & Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                    <div className="text-left lg:text-right">
                      <div className="text-xs text-text-muted">Kalan Borç</div>
                      <div className="text-xl font-bold text-amber-400">
                        {formatCurrency(item.remainingAmount, item.currency)}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        Toplam: <span className="font-semibold text-text-primary">{formatCurrency(item.totalAmount, item.currency)}</span>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <div className="text-xs text-text-muted">Aylık Taksit</div>
                      <div className="text-lg font-bold text-text-primary">
                        {formatCurrency(item.installmentAmount, item.currency)}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {paidCount} / {count} taksit ödendi
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
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

                      <div className="flex gap-2">
                        {item.status !== 'PAID' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReminder(item);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.hasReminder
                                ? 'text-blue-500 hover:bg-blue-500/10'
                                : 'text-text-muted hover:text-blue-500 hover:bg-blue-500/10'
                            }`}
                            title={item.hasReminder ? 'Hatırlatıcıları Kapat' : 'Hatırlatıcıları Aç'}
                          >
                            <Bell className="w-4 h-4" fill={item.hasReminder ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                          }}
                          className="p-1.5 text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlan(item);
                          }}
                          className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Planı Sil"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Clickable) */}
                <div 
                  className="px-5 pb-3 cursor-pointer hover:bg-bg-sidebar/30 transition-colors"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-text-muted mt-1.5">
                    <span>İlerleme: %{progressPercent}</span>
                    <span>{paidCount} ödendi, {count - paidCount} kalan</span>
                  </div>
                </div>

                {/* Installments Breakdown ("Taksitler Halinde") */}
                {isExpanded && (
                  <div className="border-t border-border bg-bg-secondary/40 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-emerald-400" />
                        Taksit Planı ve Ödeme Takvimi ({installments.length} Taksit)
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
                              const instDate = new Date(inst.dueDate);
                              const now = new Date();
                              const diffDays = Math.ceil((instDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              const isOverdue = !isPaid && diffDays < 0;
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
                                    <div className="flex flex-col">
                                      <span>{formatCurrency(inst.amount, item.currency)}</span>
                                      {(inst.paidAmount || 0) > 0 && (inst.paidAmount || 0) < inst.amount && (
                                        <span className="text-[10px] text-emerald-500 font-medium mt-0.5">
                                          {formatCurrency(inst.paidAmount, item.currency)} Ödendi
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5">
                                    {isPaid ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Ödendi
                                      </span>
                                    ) : (inst.paidAmount || 0) > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                        <Clock className="w-3 h-3" />
                                        Kısmi Ödendi
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
                                        Bekliyor
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {/* Geri Al / Öde (Tam) Butonu */}
                                      <button
                                        onClick={() => handleTogglePaid(item.id, inst)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                          isPaid
                                            ? 'bg-bg-secondary text-text-muted hover:text-amber-400 hover:bg-amber-500/10'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                        }`}
                                        title={isPaid ? 'Ödemeyi iptal et' : 'Kalan tutarın tamamını öde'}
                                      >
                                        {isPaid ? 'Geri Al' : '✓ Öde'}
                                      </button>
                                      
                                      {/* Kısmi Ödeme Butonu */}
                                      {!isPaid && item.sourceType === 'DEBT' && (
                                        <button
                                          onClick={() => setPartialPayment({
                                            debtId: item.id,
                                            instId: inst.id,
                                            remaining: inst.amount - (inst.paidAmount || 0),
                                            amount: inst.amount - (inst.paidAmount || 0),
                                            description: `${inst.number}. Taksit Kısmi Ödemesi`
                                          })}
                                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-bg-secondary border border-border text-text-primary hover:bg-bg-hover hover:border-emerald-500/30 transition-all"
                                          title="Taksitin bir kısmını öde"
                                        >
                                          Kısmi Öde
                                        </button>
                                      )}

                                      {/* Silme işlemi sadece eski Expenses mantığı için vardı, artık desteklenmiyor diyebiliriz veya sil butonunu DebtInstallment için güncelleyebiliriz. Şimdilik gizliyorum çünkü silme api si eski yapı. */}
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

      {isModalOpen && editingPlan && (
        <QuickAddModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPlan(null);
          }}
          onSuccess={loadData}
          defaultTab="expense"
          defaultIsInstallment={true}
          editData={{
            id: editingPlan.id,
            isPlan: true,
            type: 'EXPENSE',
            amount: editingPlan.totalAmount,
            merchantId: editingPlan.merchantId,
            categoryId: editingPlan.category?.id || editingPlan.categoryId,
            accountId: editingPlan.installments?.[0]?.accountId,
            date: editingPlan.firstPaymentDate,
            transactionDate: editingPlan.firstPaymentDate,
            description: editingPlan.description,
          }}
        />
      )}

      {/* Partial Payment Modal */}
      <Modal
        isOpen={!!partialPayment}
        onClose={() => setPartialPayment(null)}
        title="Kısmi Ödeme Yap"
      >
        {partialPayment && (
          <form onSubmit={handlePartialPaymentSubmit} className="space-y-4">
            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 mb-4">
              <div className="text-sm text-text-primary mb-1">{partialPayment.description}</div>
              <div className="text-xs text-text-secondary">
                Toplam Kalan: <span className="font-semibold text-emerald-500">{formatCurrency(partialPayment.remaining)}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Ödenecek Tutar (TL)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={partialPayment.remaining}
                required
                value={partialPayment.amount || ''}
                onChange={(e) => setPartialPayment({ ...partialPayment, amount: parseFloat(e.target.value) })}
                placeholder="Örn: 500"
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Kalan tutardan daha fazla ödeme yapılamaz. Tamamını ödemek için "Öde" butonunu kullanabilirsiniz.
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setPartialPayment(null)}>İptal</Button>
              <Button type="submit" variant="primary">Ödemeyi Kaydet</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
