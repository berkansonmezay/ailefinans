'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { Plus, Calendar, Edit2, Trash2, Clock, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isAllDay: boolean;
  location: string | null;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isAllDay: false,
    location: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/events');
      setEvents(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Etkinlikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ 
      title: '', 
      description: '', 
      startDate: new Date().toISOString().slice(0, 16), 
      endDate: '', 
      isAllDay: false, 
      location: '' 
    });
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setFormData({
      title: event.title,
      description: event.description || '',
      startDate: event.startDate.slice(0, 16),
      endDate: event.endDate ? event.endDate.slice(0, 16) : '',
      isAllDay: event.isAllDay,
      location: event.location || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/events/${id}`, { method: 'DELETE' });
      toast.success('Etkinlik silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        isAllDay: formData.isAllDay,
        location: formData.location || null,
      };

      if (editingId) {
        await fetchApi(`/events/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Etkinlik güncellendi');
      } else {
        await fetchApi('/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Etkinlik oluşturuldu');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  // Yaklaşan etkinlikleri tarihe göre sıralayalım
  const sortedEvents = [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Ajanda & Etkinlikler</h1>
          <p className="text-text-muted mt-1">Önemli ödemeleri, finansal tarihleri ve aile etkinliklerinizi takip edin.</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-5 h-5 mr-2" />
          Etkinlik Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-4xl">
        {loading ? (
          <p className="text-text-muted">Yükleniyor...</p>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center py-16 bg-bg-card rounded-2xl border border-border">
            <Calendar className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz etkinlik eklenmemiş</h3>
            <p className="text-text-muted max-w-md mx-auto mb-6">Ödemeleriniz veya planlarınız için ajandaya kayıt ekleyebilirsiniz.</p>
            <Button onClick={openNewModal}>Etkinlik Oluştur</Button>
          </div>
        ) : (
          sortedEvents.map(event => {
            const eventDate = new Date(event.startDate);
            const isPast = eventDate.getTime() < new Date().getTime();
            
            return (
              <Card key={event.id} className={`group border-border backdrop-blur-xl transition-all ${isPast ? 'bg-bg-card opacity-75' : 'bg-bg-card'}`}>
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  <div className={`p-6 flex flex-col justify-center items-center min-w-[120px] border-b sm:border-b-0 sm:border-r border-border ${isPast ? 'bg-bg-card text-text-muted' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    <span className="text-3xl font-bold">{eventDate.getDate()}</span>
                    <span className="text-sm font-medium uppercase tracking-wider">
                      {eventDate.toLocaleString('tr-TR', { month: 'short' })}
                    </span>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-lg font-bold ${isPast ? 'text-text-muted' : 'text-text-primary'}`}>{event.title}</h3>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(event)} className="text-text-muted hover:text-emerald-400 p-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="text-text-muted hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-text-muted mb-4">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mt-auto">
                      {!event.isAllDay && (
                        <div className="flex items-center text-sm text-text-muted">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {eventDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {event.isAllDay && (
                        <div className="flex items-center text-sm text-indigo-400">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          Tüm Gün
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-sm text-text-muted">
                          <MapPin className="w-4 h-4 mr-1.5" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Etkinliği Düzenle" : "Yeni Etkinlik Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Başlık" 
            placeholder="Örn: Ev Kirası Ödemesi" 
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
          <Input 
            label="Açıklama" 
            placeholder="Kısa bir not..." 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="flex items-center gap-2 my-2">
            <input 
              type="checkbox" 
              id="isAllDay"
              checked={formData.isAllDay}
              onChange={(e) => setFormData({...formData, isAllDay: e.target.checked})}
              className="rounded border-border bg-bg-card text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="isAllDay" className="text-sm text-text-secondary">Tüm Gün Etkinliği</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Başlangıç" 
              type={formData.isAllDay ? "date" : "datetime-local"}
              value={formData.isAllDay ? formData.startDate.split('T')[0] : formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              required
            />
            {!formData.isAllDay && (
              <Input 
                label="Bitiş (Opsiyonel)" 
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
            )}
          </div>
          <Input 
            label="Konum (Opsiyonel)" 
            placeholder="Örn: Online, İş Bankası vb." 
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
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
