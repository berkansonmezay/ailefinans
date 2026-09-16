'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import {
  Plus, Shield, ShieldAlert, ShieldCheck, ShieldX, Edit2, Trash2, Calendar,
  FileText, CheckCircle, AlertCircle, Search, Filter, Wrench, ClipboardList,
  Clock, ChevronRight, TrendingUp, Package, RefreshCw, ArrowUpRight,
  ShieldPlus, Zap, History, BellRing
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ========================
// TYPES
// ========================

interface Warranty {
  id: string;
  productName: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  category: string | null;
  tags: string[];
  purchaseDate: string;
  purchasePrice: number | null;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyType: string;
  status: string;
  purchasePlace: string | null;
  coverageDetails: string | null;
  reminderEnabled: boolean;
  remindBeforeDays: number;
  amount: number | null;
  currency: string;
  notes: string | null;
  invoiceId: string | null;
  extensions?: any[];
  claims?: any[];
  services?: any[];
  invoice?: any;
}

interface Invoice {
  id: string;
  provider: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
}

interface Stats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  openClaims: number;
  totalValue: number;
}

// ========================
// CONSTANTS
// ========================

const CATEGORIES = [
  'Elektronik', 'Beyaz Eşya', 'Küçük Ev Aletleri', 'Mobilya',
  'Otomobil', 'Hizmet', 'Giyim', 'Spor/Hobi', 'Diğer'
];

const WARRANTY_TYPES = [
  { value: 'MANUFACTURER', label: 'Üretici Garantisi' },
  { value: 'EXTENDED', label: 'Uzatılmış Garanti' },
  { value: 'SELLER', label: 'Satıcı Garantisi' },
  { value: 'INSURANCE', label: 'Sigorta Kapsamı' },
];

const CLAIM_STATUSES = [
  { value: 'SUBMITTED', label: 'Gönderildi' },
  { value: 'IN_REVIEW', label: 'İnceleniyor' },
  { value: 'APPROVED', label: 'Onaylandı' },
  { value: 'IN_REPAIR', label: 'Onarımda' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'REJECTED', label: 'Reddedildi' },
];

// ========================
// MAIN PAGE COMPONENT
// ========================

export default function WarrantiesAndInvoicesPage() {
  const [activeTab, setActiveTab] = useState<'warranties' | 'invoices' | 'services' | 'claims'>('warranties');
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expiring: 0, expired: 0, openClaims: 0, totalValue: 0 });

  // Warranties
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [warrantiesLoading, setWarrantiesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  // Services
  const [allServices, setAllServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Claims
  const [allClaims, setAllClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);

  // Modals
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  const [editingWarrantyId, setEditingWarrantyId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedReferenceType, setSelectedReferenceType] = useState<'WARRANTY' | 'INVOICE'>('WARRANTY');
  const [selectedReferenceId, setSelectedReferenceId] = useState<string>('');

  // ========================
  // FORM DATA
  // ========================

  const [warrantyForm, setWarrantyForm] = useState({
    productName: '', brand: '', model: '', serialNumber: '', category: '',
    purchaseDate: '', purchasePrice: '', warrantyStartDate: '', warrantyEndDate: '',
    warrantyType: 'MANUFACTURER', purchasePlace: '', coverageDetails: '',
    reminderEnabled: true, remindBeforeDays: '30', notes: '',
  });



  const [extendForm, setExtendForm] = useState({
    provider: '', extensionType: 'EXTENDED', startDate: '', endDate: '',
    cost: '', policyNumber: '', coverageDetails: '', notes: '',
  });

  const [claimForm, setClaimForm] = useState({
    issueDescription: '', rmaNumber: '', notes: '',
  });

  const [serviceForm, setServiceForm] = useState({
    serviceDate: '', serviceProvider: '', description: '',
    partsReplaced: '', cost: '', nextServiceDate: '', notes: '',
  });

  // ========================
  // DATA LOADING
  // ========================

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchApi<any>('/warranties/stats');
      setStats(res || { total: 0, active: 0, expiring: 0, expired: 0, openClaims: 0, totalValue: 0 });
    } catch { /* ignore */ }
  }, []);

  const loadWarranties = useCallback(async () => {
    try {
      setWarrantiesLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('pageSize', '100');
      const res = await fetchApi<any>(`/warranties?${params.toString()}`);
      setWarranties(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Garantiler yüklenemedi');
    } finally {
      setWarrantiesLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter]);

  const loadInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true);
      const res = await fetchApi<any>('/invoices');
      setInvoices(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Faturalar yüklenemedi');
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  const loadAllServices = useCallback(async () => {
    try {
      setServicesLoading(true);
      const res = await fetchApi<any>('/warranties/services?pageSize=100');
      setAllServices(Array.isArray(res) ? res : res.items || res.data || []);
    } catch { setAllServices([]); } finally { setServicesLoading(false); }
  }, []);

  const loadAllClaims = useCallback(async () => {
    try {
      setClaimsLoading(true);
      const res = await fetchApi<any>('/warranties/claims?pageSize=100');
      setAllClaims(Array.isArray(res) ? res : res.items || res.data || []);
    } catch { setAllClaims([]); } finally { setClaimsLoading(false); }
  }, []);

  useEffect(() => {
    loadStats();
    loadWarranties();
    loadInvoices();
    loadAllServices();
    loadAllClaims();
  }, [loadStats, loadWarranties, loadInvoices, loadAllServices, loadAllClaims]);

  // ========================
  // WARRANTY CRUD
  // ========================

  const openNewWarranty = () => {
    setEditingWarrantyId(null);
    setWarrantyForm({
      productName: '', brand: '', model: '', serialNumber: '', category: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      warrantyStartDate: new Date().toISOString().split('T')[0],
      warrantyEndDate: '',
      warrantyType: 'MANUFACTURER', purchasePlace: '', coverageDetails: '',
      reminderEnabled: true, remindBeforeDays: '30', notes: '',
    });
    setSelectedFile(null);
    setWarrantyModalOpen(true);
  };

  const editWarranty = (w: Warranty) => {
    setEditingWarrantyId(w.id);
    setWarrantyForm({
      productName: w.productName, brand: w.brand || '', model: w.model || '',
      serialNumber: w.serialNumber || '', category: w.category || '',
      purchaseDate: w.purchaseDate.split('T')[0],
      purchasePrice: w.purchasePrice?.toString() || '',
      warrantyStartDate: w.warrantyStartDate.split('T')[0],
      warrantyEndDate: w.warrantyEndDate.split('T')[0],
      warrantyType: w.warrantyType, purchasePlace: w.purchasePlace || '',
      coverageDetails: w.coverageDetails || '', reminderEnabled: w.reminderEnabled,
      remindBeforeDays: w.remindBeforeDays.toString(), notes: w.notes || '',
    });
    setSelectedFile(null);
    setWarrantyModalOpen(true);
  };

  const handleWarrantySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        productName: warrantyForm.productName,
        brand: warrantyForm.brand || null,
        model: warrantyForm.model || null,
        serialNumber: warrantyForm.serialNumber || null,
        category: warrantyForm.category || null,
        purchaseDate: warrantyForm.purchaseDate,
        purchasePrice: warrantyForm.purchasePrice ? Number(warrantyForm.purchasePrice) : null,
        warrantyStartDate: warrantyForm.warrantyStartDate,
        warrantyEndDate: warrantyForm.warrantyEndDate,
        warrantyType: warrantyForm.warrantyType,
        purchasePlace: warrantyForm.purchasePlace || null,
        coverageDetails: warrantyForm.coverageDetails || null,
        reminderEnabled: warrantyForm.reminderEnabled,
        remindBeforeDays: parseInt(warrantyForm.remindBeforeDays) || 30,
        notes: warrantyForm.notes || null,
      };

      if (editingWarrantyId) {
        await fetchApi(`/warranties/${editingWarrantyId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Garanti kaydı güncellendi');
      } else {
        await fetchApi('/warranties', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Garanti kaydı eklendi');
      }
      setWarrantyModalOpen(false);
      loadWarranties();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const deleteWarranty = async (id: string) => {
    if (!confirm('Bu garanti kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/warranties/${id}`, { method: 'DELETE' });
      toast.success('Kayıt silindi');
      loadWarranties();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  // ========================
  // WARRANTY DETAIL & TIMELINE
  // ========================

  const openDetail = async (w: Warranty) => {
    try {
      const [detail, tl] = await Promise.all([
        fetchApi<any>(`/warranties/${w.id}`),
        fetchApi<any>(`/warranties/${w.id}/timeline`),
      ]);
      setSelectedWarranty(detail);
      setTimeline(Array.isArray(tl) ? tl : []);
      setDetailModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Detay yüklenemedi');
    }
  };

  // ========================
  // WARRANTY EXTENSIONS
  // ========================

  const openExtendModal = (w: Warranty) => {
    setSelectedWarranty(w);
    setExtendForm({
      provider: '', extensionType: 'EXTENDED',
      startDate: w.warrantyEndDate.split('T')[0], endDate: '',
      cost: '', policyNumber: '', coverageDetails: '', notes: '',
    });
    setExtendModalOpen(true);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    try {
      await fetchApi(`/warranties/${selectedWarranty.id}/extend`, {
        method: 'POST',
        body: JSON.stringify({
          provider: extendForm.provider,
          extensionType: extendForm.extensionType,
          startDate: extendForm.startDate,
          endDate: extendForm.endDate,
          cost: extendForm.cost ? Number(extendForm.cost) : null,
          policyNumber: extendForm.policyNumber || null,
          coverageDetails: extendForm.coverageDetails || null,
          notes: extendForm.notes || null,
        }),
      });
      toast.success('Garanti uzatıldı');
      setExtendModalOpen(false);
      loadWarranties();
      loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  // ========================
  // WARRANTY CLAIMS
  // ========================

  const openClaimModal = (w: Warranty) => {
    setSelectedWarranty(w);
    setClaimForm({ issueDescription: '', rmaNumber: '', notes: '' });
    setClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    try {
      await fetchApi(`/warranties/${selectedWarranty.id}/claims`, {
        method: 'POST',
        body: JSON.stringify(claimForm),
      });
      toast.success('Garanti talebi oluşturuldu');
      setClaimModalOpen(false);
      loadWarranties();
      loadStats();
      loadAllClaims();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  // ========================
  // SERVICE RECORDS
  // ========================

  const openServiceModal = (w: Warranty) => {
    setSelectedWarranty(w);
    setServiceForm({
      serviceDate: new Date().toISOString().split('T')[0],
      serviceProvider: '', description: '', partsReplaced: '',
      cost: '', nextServiceDate: '', notes: '',
    });
    setServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    try {
      await fetchApi(`/warranties/${selectedWarranty.id}/services`, {
        method: 'POST',
        body: JSON.stringify({
          ...serviceForm,
          cost: serviceForm.cost ? Number(serviceForm.cost) : null,
          nextServiceDate: serviceForm.nextServiceDate || null,
        }),
      });
      toast.success('Servis kaydı eklendi');
      setServiceModalOpen(false);
      loadAllServices();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  // ========================
  // REMINDERS
  // ========================

  const openReminderModal = (type: 'WARRANTY' | 'INVOICE', id: string, name: string) => {
    setSelectedReferenceType(type);
    setSelectedReferenceId(id);
    setReminderForm({
      title: `${name} Hatırlatması`,
      description: '',
      amount: '',
      currency: 'TRY',
      dueDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrenceRule: 'MONTHLY'
    });
    setReminderModalOpen(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          ...reminderForm,
          amount: reminderForm.amount ? Number(reminderForm.amount) : undefined,
          referenceId: selectedReferenceId,
          referenceType: selectedReferenceType
        })
      });
      toast.success('Hatırlatıcı eklendi');
      setReminderModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  // ========================
  // INVOICE CRUD
  // ========================

  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'TRY',
    dueDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurrenceRule: 'MONTHLY'
  });

  const [invoiceForm, setInvoiceForm] = useState({
    provider: '',
    invoiceNumber: '',
    amount: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    status: 'UNPAID',
    notes: ''
  });

  const openNewInvoice = () => {
    setEditingInvoiceId(null);
    setInvoiceForm({
      provider: '', invoiceNumber: '', amount: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      status: 'UNPAID',
      notes: ''
    });
    setInvoiceModalOpen(true);
  };

  const editInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setInvoiceForm({
      provider: inv.provider, invoiceNumber: inv.invoiceNumber || '',
      amount: inv.amount.toString(),
      invoiceDate: inv.invoiceDate.split('T')[0],
      dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
      status: inv.status,
      notes: ''
    });
    setInvoiceModalOpen(true);
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        provider: invoiceForm.provider,
        invoiceNumber: invoiceForm.invoiceNumber || null,
        amount: Number(invoiceForm.amount),
        invoiceDate: new Date(invoiceForm.invoiceDate).toISOString(),
        dueDate: invoiceForm.dueDate ? new Date(invoiceForm.dueDate).toISOString() : null,
        status: invoiceForm.status,
      };
      if (editingInvoiceId) {
        await fetchApi(`/invoices/${editingInvoiceId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Fatura güncellendi');
      } else {
        await fetchApi('/invoices', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Fatura eklendi');
      }
      setInvoiceModalOpen(false);
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/invoices/${id}`, { method: 'DELETE' });
      toast.success('Fatura silindi');
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const markInvoiceAsPaid = async (id: string) => {
    try {
      await fetchApi(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'PAID' }) });
      toast.success('Fatura ödendi olarak işaretlendi');
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız');
    }
  };

  // ========================
  // HELPERS
  // ========================

  const calcDays = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { color: 'emerald', label: 'Aktif', icon: ShieldCheck };
      case 'EXPIRING': return { color: 'amber', label: 'Dolmak Üzere', icon: ShieldAlert };
      case 'EXPIRED': return { color: 'red', label: 'Süresi Dolmuş', icon: ShieldX };
      case 'CLAIMED': return { color: 'blue', label: 'Talep Açık', icon: ClipboardList };
      case 'EXTENDED': return { color: 'violet', label: 'Uzatılmış', icon: ShieldPlus };
      default: return { color: 'slate', label: status, icon: Shield };
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium border border-emerald-500/20">Ödendi</span>;
      case 'UNPAID': return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium border border-amber-500/20">Ödenmedi</span>;
      case 'OVERDUE': return <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium border border-red-500/20">Gecikmiş</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 bg-slate-500/20 text-text-muted text-xs rounded-full font-medium border border-slate-500/20">İptal</span>;
      default: return null;
    }
  };

  const getClaimStatusBadge = (status: string) => {
    const cfg = CLAIM_STATUSES.find(s => s.value === status);
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
      IN_REVIEW: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
      APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
      IN_REPAIR: 'bg-violet-500/20 text-violet-400 border-violet-500/20',
      RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
      REJECTED: 'bg-red-500/20 text-red-400 border-red-500/20',
    };
    return <span className={`px-2.5 py-1 ${colors[status] || ''} text-xs rounded-full font-medium border`}>{cfg?.label || status}</span>;
  };

  // ========================
  // TABS
  // ========================

  const tabs = [
    { key: 'warranties' as const, label: 'Garantiler', icon: Shield, count: stats.total },
    { key: 'invoices' as const, label: 'Faturalar', icon: FileText, count: invoices.length },
    { key: 'services' as const, label: 'Servis Geçmişi', icon: Wrench, count: allServices.length },
    { key: 'claims' as const, label: 'Talepler', icon: ClipboardList, count: stats.openClaims },
  ];

  // ========================
  // RENDER
  // ========================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Garanti & Fatura</h1>
          <p className="text-text-muted mt-1">Ürünlerinizin garantilerini, faturalarını ve servis geçmişlerini yönetin.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'invoices' ? (
            <Button onClick={openNewInvoice}>
              <Plus className="w-5 h-5 mr-2" />Fatura Ekle
            </Button>
          ) : (
            <Button onClick={openNewWarranty}>
              <Plus className="w-5 h-5 mr-2" />Garanti Ekle
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Toplam', value: stats.total, icon: Package, color: 'text-slate-400', bg: 'bg-slate-500/10' },
          { label: 'Aktif', value: stats.active, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Dolmak Üzere', value: stats.expiring, icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Süresi Dolmuş', value: stats.expired, icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Açık Talep', value: stats.openClaims, icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Toplam Değer', value: `${stats.totalValue.toLocaleString('tr-TR')} ₺`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">{stat.label}</p>
              <p className="text-lg font-bold text-text-primary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="bg-bg-card border border-border rounded-2xl p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-emerald-500/30' : 'bg-bg-secondary'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ======================== */}
      {/* GUARANTIES TAB */}
      {/* ======================== */}
      {activeTab === 'warranties' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Ürün adı, marka veya model ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-bg-card border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none min-w-[160px]"
            >
              <option value="">Tüm Durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="EXPIRING">Dolmak Üzere</option>
              <option value="EXPIRED">Süresi Dolmuş</option>
              <option value="CLAIMED">Talep Açık</option>
              <option value="EXTENDED">Uzatılmış</option>
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-bg-card border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none min-w-[160px]"
            >
              <option value="">Tüm Kategoriler</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Warranty List */}
          <div className="flex flex-col gap-3">
            {warrantiesLoading ? (
              <p className="text-text-muted col-span-full">Yükleniyor...</p>
            ) : warranties.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
                <Shield className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">Henüz garanti kaydı eklenmemiş</h3>
                <p className="text-text-muted mb-6">Cihazlarınızın ve ürünlerinizin garanti sürelerini takip edin.</p>
                <Button onClick={openNewWarranty}><Plus className="w-4 h-4 mr-2" />İlk Garantiyi Ekle</Button>
              </div>
            ) : (
              warranties.map(w => {
                const days = calcDays(w.warrantyEndDate);
                const cfg = getStatusConfig(w.status);
                const StatusIcon = cfg.icon;

                return (
                  <div key={w.id} className="group border border-border bg-bg-card hover:border-emerald-500/30 transition-all rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* Left: Icon & Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(w)}>
                      <div className={`p-2.5 rounded-xl bg-${cfg.color}-500/15 flex-shrink-0`}>
                        <StatusIcon className={`w-5 h-5 text-${cfg.color}-400`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-text-primary leading-tight truncate">{w.productName}</h3>
                        <p className="text-sm text-text-muted truncate mt-0.5">{[w.brand, w.model].filter(Boolean).join(' ') || 'Marka/Model belirtilmemiş'}</p>
                      </div>
                    </div>

                    {/* Middle: Badges & Dates */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-6 flex-shrink-0 w-full md:w-auto">
                      {/* Tags */}
                      <div className="flex items-center gap-2 hidden lg:flex">
                        {w.category && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-bg-secondary text-text-muted border border-border">{w.category}</span>
                        )}
                        <span className="text-xs px-2.5 py-1 rounded-full bg-bg-secondary text-text-muted border border-border">
                          {WARRANTY_TYPES.find(t => t.value === w.warrantyType)?.label || w.warrantyType}
                        </span>
                      </div>
                      
                      {/* Dates & Status */}
                      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                        <div className="text-left md:text-right hidden sm:block">
                          <p className="text-xs text-text-muted">Bitiş Tarihi</p>
                          <p className="text-sm font-medium text-text-primary">{new Date(w.warrantyEndDate).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <span className={`px-3 py-1.5 bg-${cfg.color}-500/15 text-${cfg.color}-400 text-sm rounded-full font-bold whitespace-nowrap`}>
                          {days <= 0 ? 'Süresi Doldu' : `${days} gün kaldı`}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 pt-3 md:pt-0 border-t md:border-0 border-border w-full md:w-auto justify-end">
                      <button onClick={() => openExtendModal(w)} className="text-text-muted hover:text-violet-400 p-1.5 rounded-lg hover:bg-violet-500/10" title="Garanti Uzat"><ShieldPlus className="w-4 h-4" /></button>
                      <button onClick={() => openClaimModal(w)} className="text-text-muted hover:text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/10" title="Talep Aç"><ClipboardList className="w-4 h-4" /></button>
                      <button onClick={() => openServiceModal(w)} className="text-text-muted hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/10" title="Servis Ekle"><Wrench className="w-4 h-4" /></button>
                      <button onClick={() => editWarranty(w)} className="text-text-muted hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => openReminderModal('WARRANTY', w.id, w.productName)} className="text-text-muted hover:text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/10" title="Hatırlatıcı Ekle"><BellRing className="w-4 h-4" /></button>
                      <button onClick={() => deleteWarranty(w.id)} className="text-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10" title="Sil"><Trash2 className="w-4 h-4" /></button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ======================== */}
      {/* INVOICES TAB */}
      {/* ======================== */}
      {activeTab === 'invoices' && (
        <div className="flex flex-col gap-3">
          {invoicesLoading ? (
            <p className="text-text-muted col-span-full">Yükleniyor...</p>
          ) : invoices.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
              <FileText className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">Henüz fatura eklenmemiş</h3>
              <p className="text-text-muted mb-6">Faturalarınızı ekleyerek ödeme durumlarını takip edin.</p>
              <Button onClick={openNewInvoice}><Plus className="w-4 h-4 mr-2" />İlk Faturayı Ekle</Button>
            </div>
          ) : (
            invoices.map(inv => (
              <div key={inv.id} className="group border border-border bg-bg-card hover:border-emerald-500/30 transition-all rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-text-primary leading-tight truncate">{inv.provider}</h3>
                    {inv.invoiceNumber && <p className="text-sm text-text-muted truncate mt-0.5">No: {inv.invoiceNumber}</p>}
                  </div>
                </div>

                {/* Middle: Amount & Status */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-6 flex-shrink-0 w-full md:w-auto">
                  
                  {/* Amount */}
                  <div className="flex items-end gap-1.5 hidden sm:flex">
                    <span className="text-xl font-bold text-text-primary">{inv.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-text-muted pb-0.5 text-sm">{inv.currency}</span>
                  </div>

                  {/* Dates & Status */}
                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                    {inv.dueDate && (
                      <div className="text-left md:text-right hidden sm:block">
                        <p className="text-xs text-text-muted">Son Ödeme</p>
                        <p className="text-sm font-medium text-text-primary">{new Date(inv.dueDate).toLocaleDateString('tr-TR')}</p>
                      </div>
                    )}
                    {getInvoiceStatusBadge(inv.status)}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 pt-3 md:pt-0 border-t md:border-0 border-border w-full md:w-auto justify-end items-center">
                  {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                    <Button variant="ghost" size="sm" className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 hidden md:flex mr-2" onClick={() => markInvoiceAsPaid(inv.id)}>
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Ödendi
                    </Button>
                  )}
                  <button onClick={() => openReminderModal('INVOICE', inv.id, inv.provider)} className="text-text-muted hover:text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/10" title="Hatırlatıcı Ekle"><BellRing className="w-4 h-4" /></button>
                  <button onClick={() => editInvoice(inv)} className="text-text-muted hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteInvoice(inv.id)} className="text-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10" title="Sil"><Trash2 className="w-4 h-4" /></button>
                </div>

                {/* Mobile Amount & Pay Button */}
                <div className="w-full flex items-center justify-between md:hidden">
                  <div className="flex items-end gap-1.5 sm:hidden">
                    <span className="text-xl font-bold text-text-primary">{inv.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-text-muted pb-0.5 text-sm">{inv.currency}</span>
                  </div>
                  {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-sm h-8" onClick={() => markInvoiceAsPaid(inv.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Ödendi
                    </Button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* ======================== */}
      {/* SERVICES TAB */}
      {/* ======================== */}
      {activeTab === 'services' && (
        <div className="space-y-3">
          {servicesLoading ? (
            <p className="text-text-muted">Yükleniyor...</p>
          ) : allServices.length === 0 ? (
            <div className="text-center py-16 bg-bg-card rounded-2xl border border-border">
              <Wrench className="w-14 h-14 text-text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">Henüz servis kaydı yok</h3>
              <p className="text-text-muted">Ürünleriniz için servis kaydı eklemek için garanti kartındaki 🔧 butonunu kullanın.</p>
            </div>
          ) : (
            allServices.map((svc: any) => (
              <div key={svc.id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <Wrench className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text-primary text-sm">{svc.warranty?.productName || 'Ürün'}</h4>
                    <span className="text-xs text-text-muted">•</span>
                    <span className="text-xs text-text-muted">{svc.serviceProvider}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{svc.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-text-primary">{new Date(svc.serviceDate).toLocaleDateString('tr-TR')}</p>
                  {svc.cost > 0 && <p className="text-xs text-text-muted">{svc.cost.toLocaleString('tr-TR')} {svc.currency}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================== */}
      {/* CLAIMS TAB */}
      {/* ======================== */}
      {activeTab === 'claims' && (
        <div className="space-y-3">
          {claimsLoading ? (
            <p className="text-text-muted">Yükleniyor...</p>
          ) : allClaims.length === 0 ? (
            <div className="text-center py-16 bg-bg-card rounded-2xl border border-border">
              <ClipboardList className="w-14 h-14 text-text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">Henüz garanti talebi yok</h3>
              <p className="text-text-muted">Garanti kapsamında tamir veya değişim talebi açmak için garanti kartındaki 📋 butonunu kullanın.</p>
            </div>
          ) : (
            allClaims.map((claim: any) => (
              <div key={claim.id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <ClipboardList className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text-primary text-sm">{claim.warranty?.productName || 'Ürün'}</h4>
                    {getClaimStatusBadge(claim.status)}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{claim.issueDescription}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-text-primary">{new Date(claim.claimDate).toLocaleDateString('tr-TR')}</p>
                  {claim.rmaNumber && <p className="text-xs text-text-muted">RMA: {claim.rmaNumber}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================== */}
      {/* WARRANTY MODAL */}
      {/* ======================== */}
      <Modal isOpen={warrantyModalOpen} onClose={() => setWarrantyModalOpen(false)} title={editingWarrantyId ? "Garanti Düzenle" : "Yeni Garanti Ekle"}>
        <form onSubmit={handleWarrantySubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Ürün Adı" placeholder="Örn: iPhone 15 Pro" value={warrantyForm.productName}
            onChange={e => setWarrantyForm({...warrantyForm, productName: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marka" value={warrantyForm.brand} onChange={e => setWarrantyForm({...warrantyForm, brand: e.target.value})} />
            <Input label="Model" value={warrantyForm.model} onChange={e => setWarrantyForm({...warrantyForm, model: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Seri Numarası" value={warrantyForm.serialNumber} onChange={e => setWarrantyForm({...warrantyForm, serialNumber: e.target.value})} />
            <Select label="Kategori" value={warrantyForm.category} onChange={e => setWarrantyForm({...warrantyForm, category: e.target.value})}
              options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </div>
          <Select label="Garanti Türü" value={warrantyForm.warrantyType}
            onChange={e => setWarrantyForm({...warrantyForm, warrantyType: e.target.value})} options={WARRANTY_TYPES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Satın Alma Tarihi" type="date" value={warrantyForm.purchaseDate}
              onChange={e => setWarrantyForm({...warrantyForm, purchaseDate: e.target.value})} required />
            <Input label="Satın Alma Fiyatı" type="number" min="0" step="0.01" value={warrantyForm.purchasePrice}
              onChange={e => setWarrantyForm({...warrantyForm, purchasePrice: e.target.value})} />
          </div>
          <Input label="Satın Alınan Yer" value={warrantyForm.purchasePlace}
            onChange={e => setWarrantyForm({...warrantyForm, purchasePlace: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Garanti Başlangıç" type="date" value={warrantyForm.warrantyStartDate}
              onChange={e => setWarrantyForm({...warrantyForm, warrantyStartDate: e.target.value})} required />
            <Input label="Garanti Bitiş" type="date" value={warrantyForm.warrantyEndDate}
              onChange={e => setWarrantyForm({...warrantyForm, warrantyEndDate: e.target.value})} required />
          </div>
          <Input label="Kapsam Detayı" placeholder="Opsiyonel kapsam açıklaması" value={warrantyForm.coverageDetails}
            onChange={e => setWarrantyForm({...warrantyForm, coverageDetails: e.target.value})} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Garanti Belgesi / Fatura (Opsiyonel)</label>
            <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="text-sm text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="reminderEnabled" checked={warrantyForm.reminderEnabled}
                onChange={e => setWarrantyForm({...warrantyForm, reminderEnabled: e.target.checked})}
                className="w-4 h-4 rounded border-border accent-emerald-500" />
              <label htmlFor="reminderEnabled" className="text-sm text-text-secondary">Hatırlatma</label>
            </div>
            <Input label="Kaç gün önce" type="number" min="1" value={warrantyForm.remindBeforeDays}
              onChange={e => setWarrantyForm({...warrantyForm, remindBeforeDays: e.target.value})} />
          </div>
          <Input label="Notlar" value={warrantyForm.notes} onChange={e => setWarrantyForm({...warrantyForm, notes: e.target.value})} />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setWarrantyModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>

      {/* ======================== */}
      {/* INVOICE MODAL */}
      {/* ======================== */}
      <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title={editingInvoiceId ? "Fatura Düzenle" : "Yeni Fatura Ekle"}>
        <form onSubmit={handleInvoiceSubmit} className="space-y-4">
          <Input label="Kurum / Sağlayıcı" placeholder="Örn: CK Boğaziçi Elektrik" value={invoiceForm.provider}
            onChange={e => setInvoiceForm({...invoiceForm, provider: e.target.value})} required />
          <Input label="Fatura No (Opsiyonel)" value={invoiceForm.invoiceNumber}
            onChange={e => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})} />
          <Input label="Tutar" type="number" min="0" step="0.01" value={invoiceForm.amount}
            onChange={e => setInvoiceForm({...invoiceForm, amount: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fatura Tarihi" type="date" value={invoiceForm.invoiceDate}
              onChange={e => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})} required />
            <Input label="Son Ödeme Tarihi" type="date" value={invoiceForm.dueDate}
              onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})} />
          </div>
          <Select label="Durum" value={invoiceForm.status} onChange={e => setInvoiceForm({...invoiceForm, status: e.target.value})}
            options={[
              { value: 'UNPAID', label: 'Ödenmedi' }, { value: 'PAID', label: 'Ödendi' },
              { value: 'OVERDUE', label: 'Gecikmiş' }, { value: 'CANCELLED', label: 'İptal Edildi' },
            ]} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Fatura Görseli/PDF (Opsiyonel)</label>
            <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="text-sm text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setInvoiceModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>

      {/* ======================== */}
      {/* EXTEND WARRANTY MODAL */}
      {/* ======================== */}
      <Modal isOpen={extendModalOpen} onClose={() => setExtendModalOpen(false)} title={`Garanti Uzat — ${selectedWarranty?.productName || ''}`}>
        <form onSubmit={handleExtendSubmit} className="space-y-4">
          <Input label="Uzatma Sağlayıcısı" placeholder="Örn: Hepsiburada Ek Garanti" value={extendForm.provider}
            onChange={e => setExtendForm({...extendForm, provider: e.target.value})} required />
          <Select label="Uzatma Türü" value={extendForm.extensionType}
            onChange={e => setExtendForm({...extendForm, extensionType: e.target.value})} options={WARRANTY_TYPES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Uzatma Başlangıç" type="date" value={extendForm.startDate}
              onChange={e => setExtendForm({...extendForm, startDate: e.target.value})} required />
            <Input label="Uzatma Bitiş" type="date" value={extendForm.endDate}
              onChange={e => setExtendForm({...extendForm, endDate: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ücret" type="number" min="0" step="0.01" value={extendForm.cost}
              onChange={e => setExtendForm({...extendForm, cost: e.target.value})} />
            <Input label="Poliçe No" value={extendForm.policyNumber}
              onChange={e => setExtendForm({...extendForm, policyNumber: e.target.value})} />
          </div>
          <Input label="Kapsam Detayı" value={extendForm.coverageDetails}
            onChange={e => setExtendForm({...extendForm, coverageDetails: e.target.value})} />
          <Input label="Notlar" value={extendForm.notes} onChange={e => setExtendForm({...extendForm, notes: e.target.value})} />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setExtendModalOpen(false)}>İptal</Button>
            <Button type="submit">Uzat</Button>
          </div>
        </form>
      </Modal>

      {/* ======================== */}
      {/* CLAIM MODAL */}
      {/* ======================== */}
      <Modal isOpen={claimModalOpen} onClose={() => setClaimModalOpen(false)} title={`Garanti Talebi — ${selectedWarranty?.productName || ''}`}>
        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Sorun Açıklaması</label>
            <textarea
              value={claimForm.issueDescription}
              onChange={e => setClaimForm({...claimForm, issueDescription: e.target.value})}
              className="w-full bg-bg-card border border-slate-700 rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 min-h-[100px] resize-none transition-all"
              placeholder="Yaşadığınız sorunu detaylı açıklayın..."
              required
            />
          </div>
          <Input label="RMA Numarası (Opsiyonel)" value={claimForm.rmaNumber}
            onChange={e => setClaimForm({...claimForm, rmaNumber: e.target.value})} />
          <Input label="Notlar" value={claimForm.notes} onChange={e => setClaimForm({...claimForm, notes: e.target.value})} />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setClaimModalOpen(false)}>İptal</Button>
            <Button type="submit">Talep Oluştur</Button>
          </div>
        </form>
      </Modal>

      {/* ======================== */}
      {/* SERVICE RECORD MODAL */}
      {/* ======================== */}
      <Modal isOpen={serviceModalOpen} onClose={() => setServiceModalOpen(false)} title={`Servis Kaydı — ${selectedWarranty?.productName || ''}`}>
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Servis Tarihi" type="date" value={serviceForm.serviceDate}
              onChange={e => setServiceForm({...serviceForm, serviceDate: e.target.value})} required />
            <Input label="Servis Sağlayıcısı" placeholder="Örn: Apple Yetkili Servis" value={serviceForm.serviceProvider}
              onChange={e => setServiceForm({...serviceForm, serviceProvider: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Yapılan İşlem</label>
            <textarea
              value={serviceForm.description}
              onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
              className="w-full bg-bg-card border border-slate-700 rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 min-h-[80px] resize-none transition-all"
              placeholder="Yapılan servis işlemini açıklayın..."
              required
            />
          </div>
          <Input label="Değiştirilen Parçalar" value={serviceForm.partsReplaced}
            onChange={e => setServiceForm({...serviceForm, partsReplaced: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Maliyet" type="number" min="0" step="0.01" value={serviceForm.cost}
              onChange={e => setServiceForm({...serviceForm, cost: e.target.value})} />
            <Input label="Sonraki Servis Tarihi" type="date" value={serviceForm.nextServiceDate}
              onChange={e => setServiceForm({...serviceForm, nextServiceDate: e.target.value})} />
          </div>
          <Input label="Notlar" value={serviceForm.notes} onChange={e => setServiceForm({...serviceForm, notes: e.target.value})} />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setServiceModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>

      {/* ======================== */}
      {/* DETAIL / TIMELINE MODAL */}
      {/* ======================== */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedWarranty?.productName || 'Garanti Detayı'}>
        {selectedWarranty && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Product Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Marka:</span> <span className="text-text-primary font-medium ml-1">{selectedWarranty.brand || '-'}</span></div>
              <div><span className="text-text-muted">Model:</span> <span className="text-text-primary font-medium ml-1">{selectedWarranty.model || '-'}</span></div>
              <div><span className="text-text-muted">Seri No:</span> <span className="text-text-primary font-medium ml-1">{selectedWarranty.serialNumber || '-'}</span></div>
              <div><span className="text-text-muted">Kategori:</span> <span className="text-text-primary font-medium ml-1">{selectedWarranty.category || '-'}</span></div>
              <div><span className="text-text-muted">Satın Alma:</span> <span className="text-text-primary font-medium ml-1">{new Date(selectedWarranty.purchaseDate).toLocaleDateString('tr-TR')}</span></div>
              <div><span className="text-text-muted">Fiyat:</span> <span className="text-text-primary font-medium ml-1">{selectedWarranty.purchasePrice ? `${selectedWarranty.purchasePrice.toLocaleString('tr-TR')} ${selectedWarranty.currency}` : '-'}</span></div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2"><History className="w-4 h-4 text-emerald-400" /> Zaman Çizelgesi</h4>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                {timeline.map((event, i) => {
                  const colors: Record<string, string> = {
                    purchase: 'bg-emerald-500', warranty_start: 'bg-blue-500', extension: 'bg-violet-500',
                    service: 'bg-amber-500', claim: 'bg-red-500', warranty_end: 'bg-slate-500',
                  };
                  const isPast = new Date(event.date) <= new Date();
                  return (
                    <div key={i} className="relative">
                      <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-bg-card ${colors[event.type] || 'bg-slate-500'} ${!isPast ? 'opacity-40' : ''}`} />
                      <div className={`${!isPast ? 'opacity-50' : ''}`}>
                        <p className="text-xs text-text-muted">{new Date(event.date).toLocaleDateString('tr-TR')}</p>
                        <p className="text-sm font-medium text-text-primary">{event.title}</p>
                        {event.description && <p className="text-xs text-text-muted">{event.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coverage */}
            {selectedWarranty.coverageDetails && (
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Garanti Kapsamı</h4>
                <p className="text-sm text-text-muted bg-bg-secondary p-3 rounded-xl">{selectedWarranty.coverageDetails}</p>
              </div>
            )}

            {/* Notes */}
            {selectedWarranty.notes && (
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Notlar</h4>
                <p className="text-sm text-text-muted bg-bg-secondary p-3 rounded-xl">{selectedWarranty.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 6. REMINDER MODAL */}
      <Modal isOpen={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title="Hatırlatıcı Ekle">
        <form onSubmit={handleSaveReminder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Başlık</label>
            <Input required value={reminderForm.title} onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tarih</label>
              <Input type="date" required value={reminderForm.dueDate} onChange={e => setReminderForm({ ...reminderForm, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tutar (Opsiyonel)</label>
              <Input type="number" step="0.01" value={reminderForm.amount} onChange={e => setReminderForm({ ...reminderForm, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Açıklama</label>
            <Input value={reminderForm.description} onChange={e => setReminderForm({ ...reminderForm, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="isRecurring" checked={reminderForm.isRecurring} onChange={e => setReminderForm({ ...reminderForm, isRecurring: e.target.checked })} className="rounded bg-bg-secondary border-border" />
            <label htmlFor="isRecurring" className="text-sm text-text-secondary">Tekrarlayan Hatırlatıcı</label>
          </div>
          {reminderForm.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tekrarlama Sıklığı</label>
              <Select value={reminderForm.recurrenceRule} onChange={e => setReminderForm({ ...reminderForm, recurrenceRule: e.target.value })}
                options={[
                  { value: 'DAILY', label: 'Günlük' },
                  { value: 'WEEKLY', label: 'Haftalık' },
                  { value: 'MONTHLY', label: 'Aylık' },
                  { value: 'YEARLY', label: 'Yıllık' }
                ]}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setReminderModalOpen(false)}>İptal</Button>
            <Button type="submit" variant="primary">Ekle</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
