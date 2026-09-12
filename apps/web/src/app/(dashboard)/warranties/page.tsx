'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { Plus, Shield, Edit2, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Warranty {
  id: string;
  productName: string;
  brand: string | null;
  model: string | null;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  purchasePlace: string | null;
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    productName: '',
    brand: '',
    model: '',
    purchasePlace: '',
    purchaseDate: '',
    warrantyStartDate: '',
    warrantyEndDate: '',
  });

  const loadWarranties = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/warranties');
      setWarranties(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Garantiler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarranties();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ 
      productName: '', 
      brand: '', 
      model: '',
      purchasePlace: '',
      purchaseDate: new Date().toISOString().split('T')[0], 
      warrantyStartDate: new Date().toISOString().split('T')[0], 
      warrantyEndDate: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (warr: Warranty) => {
    setEditingId(warr.id);
    setFormData({
      productName: warr.productName,
      brand: warr.brand || '',
      model: warr.model || '',
      purchasePlace: warr.purchasePlace || '',
      purchaseDate: warr.purchaseDate.split('T')[0],
      warrantyStartDate: warr.warrantyStartDate.split('T')[0],
      warrantyEndDate: warr.warrantyEndDate.split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu garanti kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/warranties/${id}`, { method: 'DELETE' });
      toast.success('Kayıt silindi');
      loadWarranties();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        productName: formData.productName,
        brand: formData.brand || null,
        model: formData.model || null,
        purchasePlace: formData.purchasePlace || null,
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
        warrantyStartDate: new Date(formData.warrantyStartDate).toISOString(),
        warrantyEndDate: new Date(formData.warrantyEndDate).toISOString(),
      };

      if (editingId) {
        await fetchApi(`/warranties/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Garanti kaydı güncellendi');
      } else {
        await fetchApi('/warranties', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Garanti kaydı eklendi');
      }
      setIsModalOpen(false);
      loadWarranties();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const calculateRemainingDays = (endDateString: string) => {
    const end = new Date(endDateString);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Garantiler</h1>
          <p className="text-text-muted mt-1">Eşyalarınızın ve cihazlarınızın garanti sürelerini takip edin.</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-5 h-5 mr-2" />
          Kayıt Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-text-muted">Yükleniyor...</p>
        ) : warranties.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
            <Shield className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz kayıt eklenmemiş</h3>
            <p className="text-text-muted">Elektronik eşyalarınızın garanti sürelerini buraya ekleyebilirsiniz.</p>
          </div>
        ) : (
          warranties.map(warr => {
            const daysRemaining = calculateRemainingDays(warr.warrantyEndDate);
            const isExpired = daysRemaining <= 0;
            const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;

            return (
              <Card key={warr.id} className="group border-border bg-bg-card backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${isExpired ? 'bg-red-500/20 text-red-400' : isExpiringSoon ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isExpired || isExpiringSoon ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-text-primary leading-tight">{warr.productName}</h3>
                        <p className="text-sm text-text-muted">{warr.brand} {warr.model}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(warr)} className="text-text-muted hover:text-emerald-400 p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(warr.id)} className="text-text-muted hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-text-muted">Satın Alınan Yer:</span>
                    <span className="text-text-primary font-medium">{warr.purchasePlace || '-'}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-sm">
                    <span className="text-text-muted flex items-center"><Calendar className="w-4 h-4 mr-1"/> Bitiş:</span>
                    <span className="text-text-primary font-medium">{new Date(warr.warrantyEndDate).toLocaleDateString('tr-TR')}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex justify-center">
                    {isExpired ? (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full font-medium">Süresi Doldu</span>
                    ) : isExpiringSoon ? (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full font-medium">{daysRemaining} gün kaldı</span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full font-medium">{daysRemaining} gün kaldı</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Garanti Düzenle" : "Yeni Garanti Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Ürün Adı" 
            placeholder="Örn: iPhone 14 Pro" 
            value={formData.productName}
            onChange={(e) => setFormData({...formData, productName: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Marka (Opsiyonel)" 
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
            />
            <Input 
              label="Model (Opsiyonel)" 
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
            />
          </div>
          <Input 
            label="Satın Alınan Yer (Opsiyonel)" 
            value={formData.purchasePlace}
            onChange={(e) => setFormData({...formData, purchasePlace: e.target.value})}
          />
          <Input 
            label="Satın Alma Tarihi" 
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Garanti Başlangıç" 
              type="date"
              value={formData.warrantyStartDate}
              onChange={(e) => setFormData({...formData, warrantyStartDate: e.target.value})}
              required
            />
            <Input 
              label="Garanti Bitiş" 
              type="date"
              value={formData.warrantyEndDate}
              onChange={(e) => setFormData({...formData, warrantyEndDate: e.target.value})}
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
