'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Plus, Target, PieChart, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  currency: string;
  period: string;
  tenant?: {
    categories?: Category[];
  };
}

export default function BudgetsPage() {
  const { confirm } = useConfirm();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: currentPeriod,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, catsRes] = await Promise.all([
        fetchApi<any>(`/budgets?period=${currentPeriod}`),
        fetchApi<any>('/categories')
      ]);
      
      const cats = Array.isArray(catsRes) ? catsRes : (catsRes.items || catsRes.data || []);
      setCategories(cats.filter((c: any) => c.type === 'EXPENSE'));
      setBudgets(budgetsRes.items || budgetsRes.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Bütçeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPeriod]);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ categoryId: '', amount: '', period: currentPeriod });
    setIsModalOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData({
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      period: budget.period,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Bütçe Sınırını Sil',
      message: 'Bu bütçe sınırını silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await fetchApi(`/budgets/${id}`, { method: 'DELETE' });
      toast.success('Bütçe sınırı silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        categoryId: formData.categoryId,
        amount: Number(formData.amount),
        period: formData.period,
      };

      if (editingId) {
        await fetchApi(`/budgets/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Bütçe güncellendi');
      } else {
        await fetchApi('/budgets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Bütçe sınırı eklendi');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Bilinmeyen Kategori';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Bütçeler</h1>
          <p className="text-text-muted mt-1">Kategoriler için harcama sınırları belirleyin.</p>
        </div>
        <div className="flex items-center gap-4">
          <Input 
            type="month" 
            value={currentPeriod}
            onChange={(e) => setCurrentPeriod(e.target.value)}
            className="w-40 bg-bg-card border-border"
          />
          <Button onClick={openNewModal}>
            <Plus className="w-5 h-5 mr-2" />
            Sınır Ekle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-text-muted">Yükleniyor...</p>
        ) : budgets.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
            <PieChart className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Bütçe sınırı bulunamadı</h3>
            <p className="text-text-muted">Bu ay için henüz hiçbir kategoriye harcama sınırı koymadınız.</p>
          </div>
        ) : (
          budgets.map(budget => (
            <Card key={budget.id} className="group border-border bg-bg-card backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary leading-tight">{getCategoryName(budget.categoryId)}</h3>
                      <p className="text-sm text-text-muted">Harcama Limiti</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(budget)} className="text-text-muted hover:text-emerald-400 p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="text-text-muted hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-3xl font-bold text-text-primary">{budget.amount.toLocaleString('tr-TR')}</span>
                  <span className="text-text-muted pb-1">{budget.currency}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Bütçe Sınırını Düzenle" : "Yeni Bütçe Sınırı Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select 
            label="Gider Kategorisi"
            value={formData.categoryId}
            onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
            required
            options={[
              { value: '', label: 'Kategori Seçin...' },
              ...categories.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
          <Input 
            label="Harcama Sınırı" 
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            required
          />
          <Input 
            label="Dönem (Ay/Yıl)" 
            type="month"
            value={formData.period}
            onChange={(e) => setFormData({...formData, period: e.target.value})}
            required
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
