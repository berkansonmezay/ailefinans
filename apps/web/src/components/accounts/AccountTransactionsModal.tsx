import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowDownRight, ArrowUpRight, Plus, Search, Trash2 } from 'lucide-react';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AccountTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  onUpdate: () => void;
}

interface Transaction {
  id: string;
  amount: number;
  transactionDate: string;
  description?: string;
  transactionType: 'INCOME' | 'EXPENSE';
}

export const AccountTransactionsModal: React.FC<AccountTransactionsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName,
  onUpdate,
}) => {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'history' | 'add'>('history');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Add Form State
  const [formData, setFormData] = useState({
    type: 'INCOME',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    if (isOpen && accountId && activeTab === 'history') {
      loadTransactions();
    }
  }, [isOpen, accountId, activeTab]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>(`/accounts/${accountId}/transactions`);
      setTransactions(Array.isArray(res) ? res : res.data || []);
    } catch (error: any) {
      toast.error('İşlem geçmişi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId: string, type: 'INCOME' | 'EXPENSE') => {
    const ok = await confirm({
      title: 'İşlemi Sil',
      message: 'Bu işlemi silmek istediğinize emin misiniz? Hesap bakiyeniz ve işlemler geçmişiniz güncellenecektir.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const endpoint = type === 'INCOME' ? `/incomes/${txId}` : `/expenses/${txId}`;
      await fetchApi(endpoint, { method: 'DELETE' });
      toast.success('İşlem silindi');
      loadTransactions();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'İşlem silinirken hata oluştu');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(Number(formData.amount))) {
      toast.error('Geçerli bir tutar girin');
      return;
    }

    try {
      const payload = {
        amount: Number(formData.amount),
        transactionDate: new Date(formData.date).toISOString(),
        description: formData.description,
        accountId: accountId,
        currency: 'TRY', // Default for now
      };

      const endpoint = formData.type === 'INCOME' ? '/incomes' : '/expenses';
      
      await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success('İşlem eklendi');
      onUpdate();
      
      // Reset and switch to history
      setFormData({
        ...formData,
        amount: '',
        description: '',
      });
      setActiveTab('history');
    } catch (error: any) {
      toast.error(error.message || 'İşlem eklenirken hata oluştu');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${accountName} - İşlemler`}>
      <div className="flex border-b border-border mb-4">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('history')}
        >
          Geçmiş İşlemler
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'add'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('add')}
        >
          Yeni İşlem Ekle
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-text-muted">Yükleniyor...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              Henüz işlem bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl border border-border group hover:border-border/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${tx.transactionType === 'INCOME' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                      {tx.transactionType === 'INCOME' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {tx.description || (tx.transactionType === 'INCOME' ? 'Para Girişi' : 'Para Çıkışı')}
                      </div>
                      <div className="text-xs text-text-muted">
                        {format(new Date(tx.transactionDate), 'd MMMM yyyy, HH:mm', { locale: tr })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`text-base font-bold font-mono ${tx.transactionType === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                      {tx.transactionType === 'INCOME' ? '+' : '-'}
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(tx.amount)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(tx.id, tx.transactionType)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                      title="İşlemi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={formData.type === 'INCOME' ? 'primary' : 'secondary'}
              className={formData.type === 'INCOME' ? 'bg-success hover:bg-success/90' : ''}
              onClick={() => setFormData({ ...formData, type: 'INCOME' })}
            >
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Para Girişi
            </Button>
            <Button
              type="button"
              variant={formData.type === 'EXPENSE' ? 'primary' : 'secondary'}
              className={formData.type === 'EXPENSE' ? 'bg-danger hover:bg-danger/90' : ''}
              onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Para Çıkışı
            </Button>
          </div>

          <Input
            label="Tutar"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />

          <Input
            label="Tarih"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <Input
            label="Açıklama (Opsiyonel)"
            placeholder="Örn: Maaş, Kira, vs."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="pt-2 flex justify-end">
            <Button type="submit" className={formData.type === 'INCOME' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'}>
              İşlemi Kaydet
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
