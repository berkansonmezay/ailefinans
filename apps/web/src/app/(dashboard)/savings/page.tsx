'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { Plus, Target, TrendingUp, Edit2, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string | null;
  status: string;
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [goalFormData, setGoalFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
  });

  const [txFormData, setTxFormData] = useState({
    amount: '',
    type: 'DEPOSIT', // DEPOSIT or WITHDRAWAL
    description: '',
  });
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/savings/goals');
      setGoals(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error: any) {
      toast.error(error.message || 'Hedefler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const openNewGoalModal = () => {
    setEditingId(null);
    setGoalFormData({ name: '', targetAmount: '', targetDate: '' });
    setIsGoalModalOpen(true);
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingId(goal.id);
    setGoalFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
    });
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Bu hedefi silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/savings/goals/${id}`, { method: 'DELETE' });
      toast.success('Hedef silindi');
      loadGoals();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: goalFormData.name,
        targetAmount: Number(goalFormData.targetAmount),
        targetDate: goalFormData.targetDate ? new Date(goalFormData.targetDate).toISOString() : null,
      };

      if (editingId) {
        await fetchApi(`/savings/goals/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Hedef güncellendi');
      } else {
        await fetchApi('/savings/goals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Hedef oluşturuldu');
      }
      setIsGoalModalOpen(false);
      loadGoals();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  const openTxModal = (goalId: string, type: 'DEPOSIT' | 'WITHDRAWAL') => {
    setSelectedGoalId(goalId);
    setTxFormData({ amount: '', type, description: '' });
    setIsTxModalOpen(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) return;
    try {
      await fetchApi(`/savings/goals/${selectedGoalId}/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(txFormData.amount),
          type: txFormData.type,
          description: txFormData.description,
        }),
      });
      toast.success('İşlem kaydedildi');
      setIsTxModalOpen(false);
      loadGoals();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Birikim & Hedefler</h1>
          <p className="text-text-muted mt-1">Gelecek planlarınız için para biriktirin ve ilerlemenizi takip edin.</p>
        </div>
        <Button onClick={openNewGoalModal}>
          <Plus className="w-5 h-5 mr-2" />
          Yeni Hedef Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-text-muted">Yükleniyor...</p>
        ) : goals.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
            <Target className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz hedef eklenmemiş</h3>
            <p className="text-text-muted">Hayalleriniz için para biriktirmeye bugün başlayın.</p>
          </div>
        ) : (
          goals.map(goal => {
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
            return (
              <Card key={goal.id} className="group border-border bg-bg-card backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl group-hover:bg-indigo-500/30 transition-colors">
                      <Target className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditGoal(goal)} className="text-text-muted hover:text-emerald-400 p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="text-text-muted hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-text-primary">{goal.name}</h3>
                  <div className="mt-2 text-3xl font-semibold text-text-primary tracking-tight">
                    {goal.currentAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg text-text-muted">{goal.currency}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-1">Hedef: {goal.targetAmount.toLocaleString('tr-TR')} {goal.currency}</p>

                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">İlerleme</span>
                      <span className="text-emerald-400 font-medium">%{progress}</span>
                    </div>
                    <div className="h-2 w-full bg-bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Button variant="secondary" className="flex-1 border-border hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50" onClick={() => openTxModal(goal.id, 'DEPOSIT')}>
                      <ArrowUpRight className="w-4 h-4 mr-1" /> Ekle
                    </Button>
                    <Button variant="secondary" className="flex-1 border-border hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50" onClick={() => openTxModal(goal.id, 'WITHDRAWAL')}>
                      <ArrowDownRight className="w-4 h-4 mr-1" /> Çek
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Hedef Ekleme/Düzenleme Modalı */}
      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title={editingId ? "Hedefi Düzenle" : "Yeni Hedef Ekle"}>
        <form onSubmit={handleGoalSubmit} className="space-y-4">
          <Input 
            label="Hedef Adı" 
            placeholder="Örn: Araba Peşinatı" 
            value={goalFormData.name}
            onChange={(e) => setGoalFormData({...goalFormData, name: e.target.value})}
            required
          />
          <Input 
            label="Hedef Tutar" 
            type="number"
            min="0"
            step="0.01"
            value={goalFormData.targetAmount}
            onChange={(e) => setGoalFormData({...goalFormData, targetAmount: e.target.value})}
            required
          />
          <Input 
            label="Hedef Tarihi (Opsiyonel)" 
            type="date"
            value={goalFormData.targetDate}
            onChange={(e) => setGoalFormData({...goalFormData, targetDate: e.target.value})}
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>

      {/* Birikim Ekle/Çek Modalı */}
      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={txFormData.type === 'DEPOSIT' ? "Birikim Ekle" : "Birikimden Çek"}>
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <Input 
            label="Tutar" 
            type="number"
            min="0.01"
            step="0.01"
            value={txFormData.amount}
            onChange={(e) => setTxFormData({...txFormData, amount: e.target.value})}
            required
          />
          <Input 
            label="Açıklama (Opsiyonel)" 
            placeholder="Örn: Ekim ayı maaşından"
            value={txFormData.description}
            onChange={(e) => setTxFormData({...txFormData, description: e.target.value})}
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsTxModalOpen(false)}>İptal</Button>
            <Button type="submit" className={txFormData.type === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}>
              {txFormData.type === 'DEPOSIT' ? 'Para Ekle' : 'Para Çek'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
