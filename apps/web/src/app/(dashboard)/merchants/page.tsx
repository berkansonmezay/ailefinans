'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { Plus, Store, Edit2, Trash2, MapPin, Phone, Globe, LayoutGrid, List as ListIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Merchant {
  id: string;
  name: string;
  type: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    address: '',
    phone: '',
    website: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/merchants');
      setMerchants(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Kurumlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', type: '', address: '', phone: '', website: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingId(merchant.id);
    setFormData({
      name: merchant.name,
      type: merchant.type || '',
      address: merchant.address || '',
      phone: merchant.phone || '',
      website: merchant.website || '',
      notes: merchant.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kurumu silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/merchants/${id}`, { method: 'DELETE' });
      toast.success('Kurum silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        type: formData.type || null,
        address: formData.address || null,
        phone: formData.phone || null,
        website: formData.website || null,
        notes: formData.notes || null,
      };

      if (editingId) {
        await fetchApi(`/merchants/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Kurum güncellendi');
      } else {
        await fetchApi('/merchants', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Kurum eklendi');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Harcama Yerleri</h1>
          <p className="text-text-muted mt-1">Sık alışveriş yaptığınız yerleri ve hizmet aldığınız kurumları yönetin.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-bg-card border border-border rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-bg-sidebar text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              title="Izgara Görünümü"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-bg-sidebar text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              title="Liste Görünümü"
            >
              <ListIcon size={18} />
            </button>
          </div>
          <Button onClick={openNewModal}>
            <Plus className="w-5 h-5 mr-2" />
            Yeni Ekle
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-text-muted">Yükleniyor...</p>
      ) : merchants.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
          <Store className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Henüz kayıt eklenmemiş</h3>
          <p className="text-text-muted">Alışveriş yaptığınız yerleri kaydederek giderlerinizi daha detaylı analiz edebilirsiniz.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {merchants.map(merchant => (
            <Card key={merchant.id} className="group border-border bg-bg-card backdrop-blur-xl">
              <CardContent className="p-3.5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-text-primary leading-tight truncate">{merchant.name}</h3>
                      <p className="text-[13px] text-text-muted mt-0.5 truncate">{merchant.type || 'Belirtilmemiş Kategori'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(merchant)} className="text-text-muted hover:text-emerald-400 p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(merchant.id)} className="text-text-muted hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                  {merchant.address && (
                    <div className="flex items-start gap-2 text-[13px] text-text-secondary">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-text-muted shrink-0" />
                      <span className="line-clamp-1">{merchant.address}</span>
                    </div>
                  )}
                  {merchant.phone && (
                    <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                      <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>{merchant.phone}</span>
                    </div>
                  )}
                  {merchant.website && (
                    <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                      <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <a href={merchant.website.startsWith('http') ? merchant.website : `https://${merchant.website}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">
                        {merchant.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border border-border bg-bg-card backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-sidebar border-b border-border">
                <tr>
                  <th className="px-4 py-2 font-semibold text-text-secondary">İsim</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary">Kategori</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary">İletişim</th>
                  <th className="px-4 py-2 font-semibold text-text-secondary text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-bg-sidebar/50 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="font-medium text-text-primary">{merchant.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {merchant.type || '-'}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      <div className="flex gap-4">
                        {merchant.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {merchant.phone}</div>}
                        {merchant.website && <div className="flex items-center gap-1"><Globe className="w-3 h-3" /> <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-500">Site</a></div>}
                        {!merchant.phone && !merchant.website && '-'}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(merchant)} className="p-1.5 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors" title="Düzenle">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(merchant.id)} className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors" title="Sil">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Harcama Yeri Düzenle" : "Yeni Harcama Yeri Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Harcama Yeri Adı" 
            placeholder="Örn: Migros" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
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
