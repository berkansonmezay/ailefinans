'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, Tag, ArrowUpCircle, ArrowDownCircle, Trash2, Edit2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isSystem: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const [incomePage, setIncomePage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
  });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/categories');
      setCategories(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error: any) {
      toast.error(error.message || 'Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, type: category.type });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'EXPENSE' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetchApi(`/categories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Kategori başarıyla güncellendi');
      } else {
        await fetchApi('/categories', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Kategori başarıyla oluşturuldu');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/categories/${id}`, { method: 'DELETE' });
      toast.success('Kategori silindi');
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Kategori silinirken hata oluştu');
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const expenses = filteredCategories.filter(c => c.type === 'EXPENSE');
  const incomes = filteredCategories.filter(c => c.type === 'INCOME');

  const paginatedExpenses = expenses.slice((expensePage - 1) * ITEMS_PER_PAGE, expensePage * ITEMS_PER_PAGE);
  const paginatedIncomes = incomes.slice((incomePage - 1) * ITEMS_PER_PAGE, incomePage * ITEMS_PER_PAGE);

  const renderPagination = (currentPage: number, totalItems: number, setPage: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
          <button
            key={pageNum}
            onClick={() => setPage(pageNum)}
            className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors ${
              currentPage === pageNum 
                ? 'bg-accent text-text-primary font-medium' 
                : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary'
            }`}
          >
            {pageNum}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Kategoriler</h1>
          <p className="text-text-muted mt-1">Gelir ve gider işlemleriniz için kategorileri yönetin.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Kategori ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-bg-card border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 w-full sm:w-64 transition-all"
            />
          </div>
          <Button onClick={openNewModal}>
            <Plus className="w-5 h-5 mr-2" />
            Yeni Kategori
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gider Kategorileri */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-bold text-text-primary">Gider Kategorileri</h2>
              </div>
              <span className="text-xs bg-bg-secondary text-text-muted px-2 py-1 rounded-md font-medium">{expenses.length} adet</span>
            </div>
            {loading ? (
              <p className="text-text-muted">Yükleniyor...</p>
            ) : expenses.length === 0 ? (
              <p className="text-text-muted">Henüz gider kategorisi eklenmemiş.</p>
            ) : (
              <>
                <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden shadow-sm">
                  {paginatedExpenses.map(cat => (
                    <li key={cat.id} className="flex justify-between items-center px-4 py-2.5 bg-bg-card hover:bg-bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-text-muted" />
                        <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(cat)} className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {renderPagination(expensePage, expenses.length, setExpensePage)}
              </>
            )}
          </CardContent>
        </Card>

        {/* Gelir Kategorileri */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-text-primary">Gelir Kategorileri</h2>
              </div>
              <span className="text-xs bg-bg-secondary text-text-muted px-2 py-1 rounded-md font-medium">{incomes.length} adet</span>
            </div>
            {loading ? (
              <p className="text-text-muted">Yükleniyor...</p>
            ) : incomes.length === 0 ? (
              <p className="text-text-muted">Henüz gelir kategorisi eklenmemiş.</p>
            ) : (
              <>
                <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden shadow-sm">
                  {paginatedIncomes.map(cat => (
                    <li key={cat.id} className="flex justify-between items-center px-4 py-2.5 bg-bg-card hover:bg-bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-text-muted" />
                        <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(cat)} className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {renderPagination(incomePage, incomes.length, setIncomePage)}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Kategori Düzenle" : "Yeni Kategori Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Kategori Adı" 
            placeholder="Örn: Mutfak Masrafları" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Select 
            label="Kategori Türü"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            options={[
              { value: 'EXPENSE', label: 'Gider' },
              { value: 'INCOME', label: 'Gelir' },
            ]}
          />
          
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
    </div>
  );
}
