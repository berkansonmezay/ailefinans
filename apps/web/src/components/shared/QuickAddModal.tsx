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
  defaultIsInstallment?: boolean;
}

export function QuickAddModal({ isOpen, onClose, onSuccess, defaultTab = 'expense', editData, defaultIsInstallment = false }: QuickAddModalProps) {
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
      if (editData) {
        setAmount(String(editData.amount || ''));
        setMerchantId(editData.merchantId || editData.accountId || '');
        setCategoryId(editData.categoryId || '');
        if (editData.transactionDate || editData.date) {
          setDate(new Date(editData.transactionDate || editData.date).toISOString().split('T')[0]);
        }
        setDescription(editData.description || '');
        setActiveTab(editData.type === 'EXPENSE' ? 'expense' : 'income');
        setIsInstallment(false);
        setInstallmentCount('2');
        setFirstInstallmentDate(new Date(editData.transactionDate || editData.date || new Date()).toISOString().split('T')[0]);
      } else {
        setAmount('');
        setMerchantId('');
        setCategoryId('');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setIsInstallment(false);
        setInstallmentCount('2');
        setFirstInstallmentDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, editData]);

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
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  if (!isOpen || !mounted) return null;

  const isExpense = activeTab === 'expense';
  const headerColor = isExpense ? 'bg-[#e53e3e]' : 'bg-[#10b981]'; // Matched red and green from screenshots

  const filteredCategories = categories.filter(c => c.type === (isExpense ? 'EXPENSE' : 'INCOME'));

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error('Lütfen geçerli bir tutar girin');
    }
    
    setLoading(true);
    try {
      const isMerchant = merchants.some(m => m.id === merchantId);
      const isAccount = accounts.some(a => a.id === merchantId);
      const parsedAmount = parseFloat(amount);

      let payloads: any[] = [];
      const generateInstallmentsId = () => Math.random().toString(36).substring(2, 15);
      
      if (isInstallment && !editData) {
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
        for (const payload of payloads) {
          const { _planId, ...rest } = payload;
          const finalPayload = { ...rest, merchantId: isMerchant ? merchantId : null, accountId: isAccount ? merchantId : null };
          if (_planId) finalPayload.installmentPlanId = _planId;
          
          if (editData && payloads.length === 1) {
            await fetchApi(`/expenses/${editData.id}`, { method: 'PUT', body: JSON.stringify(finalPayload) });
          } else {
            await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        }
        toast.success(isInstallment && !editData ? 'Taksitli gider başarıyla eklendi' : 'Gider başarıyla eklendi/güncellendi');
      } else {
        const selectedMerchant = merchants.find(m => m.id === merchantId);
        const selectedAccount = accounts.find(a => a.id === merchantId);
        
        for (const payload of payloads) {
          const { _planId, ...rest } = payload;
          const finalPayload = { ...rest, source: selectedMerchant ? selectedMerchant.name : (selectedAccount ? selectedAccount.name : null), accountId: isAccount ? merchantId : null };
          if (_planId) finalPayload.parentId = _planId; // Use parentId for incomes as a grouping mechanism
          
          if (editData && payloads.length === 1) {
            await fetchApi(`/incomes/${editData.id}`, { method: 'PUT', body: JSON.stringify(finalPayload) });
          } else {
            await fetchApi('/incomes', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        }
        toast.success(isInstallment && !editData ? 'Taksitli gelir başarıyla eklendi' : 'Gelir başarıyla eklendi/güncellendi');
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
            <h2 className="text-[1.2rem] font-semibold tracking-tight">{editData ? 'İşlemi Düzenle' : 'Hızlı İşlem Ekle'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => !editData && setActiveTab('expense')}
              disabled={!!editData}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-medium transition-colors duration-200 ${
                isExpense ? 'bg-white/25 shadow-sm text-text-primary' : 'bg-white/10 hover:bg-white/15 text-text-primary/90'
              } ${editData ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              <TrendingDown size={18} strokeWidth={2.5} />
              Gider
            </button>
            <button
              onClick={() => !editData && setActiveTab('income')}
              disabled={!!editData}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-medium transition-colors duration-200 ${
                !isExpense ? 'bg-white/25 shadow-sm text-text-primary' : 'bg-white/10 hover:bg-white/15 text-text-primary/90'
              } ${editData ? 'opacity-80 cursor-not-allowed' : ''}`}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tutar (₺)</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-center text-3xl font-bold text-text-muted bg-white border border-slate-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-shadow"
              autoFocus
            />
          </div>

          {/* Row: Merchant & Category */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Harcama Yeri</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                >
                  <option value="">Seçiniz</option>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Seçiniz</option>
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
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-8 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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

          <div className="flex flex-col bg-slate-50/80 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-text-muted" strokeWidth={1.5} />
                <div>
                  <p className="text-[14px] font-bold text-slate-800">Taksitli İşlem</p>
                  <p className="text-[11px] text-text-muted font-medium">Bu işlemi taksitlere böl</p>
                </div>
              </div>
              <button 
                type="button"
                className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out relative ${isInstallment ? headerColor : 'bg-slate-200'}`}
                onClick={() => setIsInstallment(!isInstallment)}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ease-in-out ${isInstallment ? 'translate-x-5' : 'translate-x-0.5'} shadow-sm`} />
              </button>
            </div>
            {isInstallment && (
              <div className="p-3 border-t border-slate-200 bg-white">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Taksit Sayısı</label>
                    <input 
                      type="number"
                      min="2"
                      max="36"
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:border-slate-300 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">İlk Taksit</label>
                    <div className="relative">
                      <input 
                        type="date"
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
                      ₺{((parseFloat(amount) || 0) / (parseInt(installmentCount) || 1)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 mt-1 rounded-xl text-text-primary font-semibold text-[16px] transition-all duration-200 ${headerColor} hover:brightness-95 active:scale-[0.98] disabled:opacity-70 shadow-sm`}
          >
            {loading ? 'Ekleniyor...' : (editData ? (isExpense ? 'Gideri Güncelle' : 'Geliri Güncelle') : (isExpense ? 'Gider Ekle' : 'Gelir Ekle'))}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
