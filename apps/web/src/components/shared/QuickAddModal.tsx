'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingDown, TrendingUp, Calendar, Hash } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: 'expense' | 'income';
  editData?: any;
  initialData?: any;
  defaultIsInstallment?: boolean;
}

export function QuickAddModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTab = 'expense',
  editData,
  initialData,
  defaultIsInstallment = false
}: QuickAddModalProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [amount, setAmount] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isInstallment, setIsInstallment] = useState(defaultIsInstallment);
  const [installmentCount, setInstallmentCount] = useState('2');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [mounted, setMounted] = useState(false);

  const isEdit = Boolean(editData && editData.id);
  const activeData = editData || initialData;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadOptions();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (activeData) {
        setAmount(activeData.amount !== undefined && activeData.amount !== null ? String(activeData.amount) : '');
        setMerchantId(activeData.merchantId || activeData.accountId || '');
        setCategoryId(activeData.categoryId || '');
        if (activeData.transactionDate || activeData.date) {
          try {
            setDate(new Date(activeData.transactionDate || activeData.date).toISOString().split('T')[0]);
          } catch {
            setDate(new Date().toISOString().split('T')[0]);
          }
        }
        setDescription(activeData.description || '');
        setActiveTab(activeData.type === 'INCOME' ? 'income' : 'expense');
        setIsInstallment(false);
        setInstallmentCount('2');
        if (activeData.transactionDate || activeData.date) {
          try {
            setFirstInstallmentDate(new Date(activeData.transactionDate || activeData.date).toISOString().split('T')[0]);
          } catch {
            setFirstInstallmentDate(new Date().toISOString().split('T')[0]);
          }
        }
      } else {
        setAmount('');
        setMerchantId('');
        setCategoryId('');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setIsInstallment(defaultIsInstallment);
        setInstallmentCount('2');
        setFirstInstallmentDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, editData, initialData]);

  const loadOptions = async () => {
    try {
      const [catRes, merRes, accRes] = await Promise.all([
        fetchApi<any>('/categories'),
        fetchApi<any>('/merchants').catch(() => []),
        fetchApi<any>('/accounts').catch(() => [])
      ]);
      const cats = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      const mers = Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []);
      const accs = Array.isArray(accRes) ? accRes : (accRes.items || accRes.data || []);
      setCategories(cats);
      setMerchants(mers);
      setAccounts(accs);

      // Auto-match merchant if vendorName is passed from invoice scanner and merchantId not set yet
      if (activeData?.vendorName && !activeData?.merchantId && !merchantId) {
        const vendorClean = activeData.vendorName.trim().toLowerCase();
        const matched = mers.find((m: any) =>
          m.name.toLowerCase().includes(vendorClean) || vendorClean.includes(m.name.toLowerCase())
        );
        if (matched) {
          setMerchantId(matched.id);
        }
      }
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  if (!isOpen || !mounted) return null;

  const isExpense = activeTab === 'expense';
  const headerColor = isExpense ? 'bg-[#e53e3e]' : 'bg-[#10b981]'; // Matched red and green from screenshots

  const filteredCategories = categories.filter(c => c.type === (isExpense ? 'EXPENSE' : 'INCOME'));

  const parseAmountValue = (val: any) => {
    if (val === undefined || val === null || val === '') return NaN;
    if (typeof val === 'number') return val;
    const normalized = String(val).replace(/\s/g, '').replace(',', '.');
    return parseFloat(normalized);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseAmountValue(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return toast.error('Lütfen geçerli bir tutar girin');
    }
    if (isExpense) {
      if (!merchantId) {
        return toast.error('Kayıt tamamlanamaz: Lütfen Harcama Yeri seçiniz.');
      }
      if (!categoryId) {
        return toast.error('Kayıt tamamlanamaz: Lütfen bir Harcama Kategorisi seçiniz.');
      }
    }
    
    setLoading(true);
    try {
      const isMerchant = merchants.some(m => m.id === merchantId);
      const isAccount = accounts.some(a => a.id === merchantId);

      let payloads: any[] = [];
      const generateInstallmentsId = () => Math.random().toString(36).substring(2, 15);
      
      if (isInstallment && !isEdit) {
        const count = parseInt(installmentCount);
        if (isNaN(count) || count < 2) throw new Error('Geçersiz taksit sayısı');
        
        const installmentAmount = parsedAmount / count;
        const planId = generateInstallmentsId();
        
        for (let i = 0; i < count; i++) {
          const installmentDate = new Date(firstInstallmentDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          
          payloads.push({
            amount: installmentAmount,
            categoryId: categoryId || null,
            transactionDate: installmentDate.toISOString(),
            description: description ? `${description} (${i+1}. Taksit / ${count})` : `Taksit ${i+1}/${count}`,
            _planId: planId, // temporarily store it
          });
        }
      } else {
        payloads.push({
          amount: parsedAmount,
          categoryId: categoryId || null,
          transactionDate: new Date(date).toISOString(),
          description: description || null,
        });
      }

      if (isExpense) {
        if (isEdit && editData.isPlan) {
          // Edit Debt Plan
          await fetchApi(`/debts/${editData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              description,
              merchantId: isMerchant ? merchantId : null,
              accountId: isAccount ? merchantId : null,
              categoryId: categoryId || null,
              creditor: description,
            })
          });
          toast.success('Taksitli borç planı güncellendi');
        } else if (isInstallment && !isEdit) {
          const count = parseInt(installmentCount);
          await fetchApi('/debts', {
            method: 'POST',
            body: JSON.stringify({
              creditor: description || 'Taksitli Gider',
              description: description || 'Taksitli Gider',
              principalAmount: parsedAmount,
              totalAmount: parsedAmount,
              installmentCount: count,
              installmentAmount: parsedAmount / count,
              firstPaymentDate: new Date(firstInstallmentDate).toISOString(),
              startDate: new Date().toISOString(),
              categoryId: categoryId || null,
              accountId: isAccount ? merchantId : null,
              merchantId: isMerchant ? merchantId : null,
              currency: 'TRY'
            })
          });
          toast.success('Taksitli gider başarıyla eklendi');
        } else {
          for (const payload of payloads) {
            const { _planId, ...rest } = payload;
            const finalPayload = { ...rest, merchantId: isMerchant ? merchantId : null, accountId: isAccount ? merchantId : null };
            
            if (isEdit && payloads.length === 1) {
              await fetchApi(`/expenses/${editData.id}`, { method: 'PUT', body: JSON.stringify(finalPayload) });
            } else {
              await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(finalPayload) });
            }
          }
          toast.success(isEdit ? 'Gider başarıyla güncellendi' : 'Gider başarıyla eklendi');
        }
      } else {
        const selectedMerchant = merchants.find(m => m.id === merchantId);
        const selectedAccount = accounts.find(a => a.id === merchantId);
        
        if (isEdit && editData.isPlan) {
          // Edit Receivable Plan
          await fetchApi(`/receivables/plan/${editData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              description,
              merchantId: isMerchant ? merchantId : null,
              accountId: isAccount ? merchantId : null,
              categoryId: categoryId || null,
              source: selectedMerchant ? selectedMerchant.name : (selectedAccount ? selectedAccount.name : null),
            })
          });
          toast.success('Taksitli alacak planı güncellendi');
        } else {
          for (const payload of payloads) {
            const { _planId, ...rest } = payload;
            const finalPayload = { ...rest, source: selectedMerchant ? selectedMerchant.name : (selectedAccount ? selectedAccount.name : null), accountId: isAccount ? merchantId : null };
            if (_planId) finalPayload.parentId = _planId; // Use parentId for incomes as a grouping mechanism
            
            if (isEdit && payloads.length === 1) {
              await fetchApi(`/incomes/${editData.id}`, { method: 'PUT', body: JSON.stringify(finalPayload) });
            } else {
              await fetchApi('/incomes', { method: 'POST', body: JSON.stringify(finalPayload) });
            }
          }
          toast.success(isInstallment && !isEdit ? 'Taksitli gelir başarıyla eklendi' : (isEdit ? 'Gelir başarıyla güncellendi' : 'Gelir başarıyla eklendi'));
        }
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`${headerColor} px-4 pt-4 pb-3 text-text-primary transition-colors duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[1.2rem] font-semibold tracking-tight">
              {isEdit ? 'İşlemi Düzenle' : (activeData?.fromInvoice ? 'Faturadan Gider Ekle' : 'Hızlı İşlem Ekle')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => !isEdit && setActiveTab('expense')}
              disabled={isEdit}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-medium transition-colors duration-200 ${
                isExpense ? 'bg-white/25 shadow-sm text-text-primary' : 'bg-white/10 hover:bg-white/15 text-text-primary/90'
              } ${isEdit ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              <TrendingDown size={18} strokeWidth={2.5} />
              Gider
            </button>
            <button
              onClick={() => !isEdit && setActiveTab('income')}
              disabled={isEdit}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-medium transition-colors duration-200 ${
                !isExpense ? 'bg-white/25 shadow-sm text-text-primary' : 'bg-white/10 hover:bg-white/15 text-text-primary/90'
              } ${isEdit ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              <TrendingUp size={18} strokeWidth={2.5} />
              Gelir
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Tutar (₺)</label>
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => !isEdit && setIsInstallment(false)}
                  disabled={isEdit}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    !isInstallment 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  } ${isEdit ? 'opacity-80 cursor-not-allowed' : ''}`}
                >
                  Tek Çekim
                </button>
                <button
                  type="button"
                  onClick={() => !isEdit && setIsInstallment(true)}
                  disabled={isEdit}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                    isInstallment 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  } ${isEdit ? 'opacity-80 cursor-not-allowed' : ''}`}
                >
                  <Hash size={12} />
                  Taksitli
                </button>
              </div>
            </div>
            <input 
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={Boolean(isEdit && editData?.isPlan)}
              className={`w-full text-center text-3xl font-bold text-slate-800 bg-white border border-slate-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-shadow ${Boolean(isEdit && editData?.isPlan) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
              autoFocus
            />
          </div>

          {/* Row: Merchant & Category */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harcama Yeri {isExpense && <span className="text-rose-500 font-bold text-[10px]">* Zorunlu</span>}
              </label>
              <div className="relative">
                <select 
                  className={`w-full appearance-none bg-white border rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow ${
                    isExpense && !merchantId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                >
                  <option value="">Seçiniz {isExpense ? '(Zorunlu)' : ''}</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-text-muted">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori <span className="text-rose-500 font-bold text-[10px]">* Zorunlu</span>
              </label>
              <div className="relative">
                <select 
                  className={`w-full appearance-none bg-white border rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow ${
                    !categoryId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Seçiniz (Zorunlu)</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-text-muted">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Row: Date & Description */}
          <div className="flex gap-4">
            {/* Date */}
            <div className="w-1/3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
              <div className="relative">
                <input 
                  type="date"
                  value={date}
                  disabled={Boolean(isEdit && editData?.isPlan)}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-8 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${Boolean(isEdit && editData?.isPlan) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                />
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-900">
                  <Calendar size={16} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama</label>
              <input 
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="İşlem açıklaması..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-text-muted transition-shadow"
              />
            </div>
          </div>

          {isInstallment && (
            <div className="flex flex-col bg-slate-50/80 rounded-xl border border-border overflow-hidden">
              <div className="p-3 bg-white border-t border-slate-200">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Taksit Sayısı</label>
                    <input 
                      type="number"
                      min="2"
                      max="36"
                      disabled={Boolean(isEdit && editData?.isPlan)}
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(e.target.value)}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:border-slate-300 transition-colors ${Boolean(isEdit && editData?.isPlan) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">İlk Taksit</label>
                    <div className="relative">
                      <input 
                        type="date"
                        disabled={Boolean(isEdit && editData?.isPlan)}
                        value={firstInstallmentDate}
                        onChange={(e) => setFirstInstallmentDate(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-[13px] font-medium focus:outline-none focus:border-slate-300 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-700">
                        <Calendar size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Taksit Tutarı</label>
                    <div className="w-full bg-slate-50/50 border border-slate-100 rounded-lg px-3 py-2.5 text-indigo-600 text-[14px] font-bold flex items-center h-[42px]">
                      ₺{((parseAmountValue(amount) || 0) / (parseInt(installmentCount) || 1)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 mt-1 rounded-xl text-text-primary font-semibold text-[16px] transition-all duration-200 ${headerColor} hover:brightness-95 active:scale-[0.98] disabled:opacity-70 shadow-sm`}
          >
            {loading ? (isEdit ? 'Güncelleniyor...' : 'Ekleniyor...') : (isEdit ? (isExpense ? 'Gideri Güncelle' : 'Geliri Güncelle') : (isExpense ? 'Gider Ekle' : 'Gelir Ekle'))}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
