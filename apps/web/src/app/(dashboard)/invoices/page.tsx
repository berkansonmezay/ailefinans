'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, FileText, CheckCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Invoice {
  id: string;
  provider: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string; // UNPAID, PAID, OVERDUE, CANCELLED
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    provider: '',
    invoiceNumber: '',
    amount: '',
    invoiceDate: '',
    dueDate: '',
    status: 'UNPAID',
  });

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/invoices');
      setInvoices(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Faturalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ 
      provider: '', 
      invoiceNumber: '', 
      amount: '', 
      invoiceDate: new Date().toISOString().split('T')[0], 
      dueDate: '', 
      status: 'UNPAID' 
    });
    setIsModalOpen(true);
  };

  const handleEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setFormData({
      provider: inv.provider,
      invoiceNumber: inv.invoiceNumber || '',
      amount: inv.amount.toString(),
      invoiceDate: inv.invoiceDate.split('T')[0],
      dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
      status: inv.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/invoices/${id}`, { method: 'DELETE' });
      toast.success('Fatura silindi');
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        provider: formData.provider,
        invoiceNumber: formData.invoiceNumber || null,
        amount: Number(formData.amount),
        invoiceDate: new Date(formData.invoiceDate).toISOString(),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        status: formData.status,
      };

      if (editingId) {
        await fetchApi(`/invoices/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Fatura güncellendi');
      } else {
        await fetchApi('/invoices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Fatura eklendi');
      }
      setIsModalOpen(false);
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await fetchApi(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PAID' }),
      });
      toast.success('Fatura ödendi olarak işaretlendi');
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium border border-emerald-500/20">Ödendi</span>;
      case 'UNPAID':
        return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium border border-amber-500/20">Ödenmedi</span>;
      case 'OVERDUE':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium border border-red-500/20">Gecikmiş</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-slate-500/20 text-text-muted text-xs rounded-full font-medium border border-slate-500/20">İptal</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Faturalar</h1>
          <p className="text-text-muted mt-1">Elektrik, su, doğalgaz gibi faturalarınızı ve ödeme durumlarını yönetin.</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-5 h-5 mr-2" />
          Fatura Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-text-muted">Yükleniyor...</p>
        ) : invoices.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz fatura eklenmemiş</h3>
            <p className="text-text-muted">Ödemeniz gereken faturaları buraya ekleyerek takip edebilirsiniz.</p>
          </div>
        ) : (
          invoices.map(inv => (
            <Card key={inv.id} className="group border-border bg-bg-card backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${inv.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary leading-tight">{inv.provider}</h3>
                      {inv.invoiceNumber && <p className="text-sm text-text-muted">No: {inv.invoiceNumber}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(inv)} className="text-text-muted hover:text-emerald-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(inv.id)} className="text-text-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-bold text-text-primary">{inv.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-text-muted pb-1">{inv.currency}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  {getStatusBadge(inv.status)}
                  {inv.dueDate && (
                    <span className="text-sm text-text-muted">Son Ödeme: <span className="text-text-primary">{new Date(inv.dueDate).toLocaleDateString('tr-TR')}</span></span>
                  )}
                </div>

                {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                  <Button 
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700" 
                    onClick={() => markAsPaid(inv.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Ödendi İşaretle
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Fatura Düzenle" : "Yeni Fatura Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Kurum / Sağlayıcı" 
            placeholder="Örn: CK Boğaziçi Elektrik" 
            value={formData.provider}
            onChange={(e) => setFormData({...formData, provider: e.target.value})}
            required
          />
          <Input 
            label="Fatura No (Opsiyonel)" 
            value={formData.invoiceNumber}
            onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
          />
          <Input 
            label="Tutar" 
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Fatura Tarihi" 
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
              required
            />
            <Input 
              label="Son Ödeme Tarihi" 
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>
          <Select 
            label="Durum"
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
            options={[
              { value: 'UNPAID', label: 'Ödenmedi' },
              { value: 'PAID', label: 'Ödendi' },
              { value: 'OVERDUE', label: 'Gecikmiş' },
              { value: 'CANCELLED', label: 'İptal Edildi' },
            ]}
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
