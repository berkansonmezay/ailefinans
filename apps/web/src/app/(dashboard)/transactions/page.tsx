'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select as CustomSelect } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Search, Filter, Upload, FileSpreadsheet, FileText, MapPin, Edit, Trash2, Plus, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QuickAddModal } from '@/components/shared/QuickAddModal';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TransactionsPage() {
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [initialTxData, setInitialTxData] = useState<any>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    vade: '',
    categoryId: 'Tümü',
    accountId: 'Tümü',
    search: '',
    year: 'Tüm Yıllar',
    startDate: '',
    endDate: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(tx => {
      // Sadece ödenmiş olan taksitleri göster
      if (tx.type === 'EXPENSE' && tx.installmentPlanId && tx.notes !== 'PAID') {
        return false;
      }
      if (tx.type === 'INCOME' && tx.parentId && tx.recurrenceRule !== 'COLLECTED') {
        return false;
      }

      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          tx.description?.toLowerCase()?.includes(searchLower) ||
          tx.merchant?.name?.toLowerCase()?.includes(searchLower) ||
          tx.source?.toLowerCase()?.includes(searchLower) ||
          categories.find(c => c.id === tx.categoryId)?.name?.toLowerCase()?.includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Category
      if (filters.categoryId !== 'Tümü') {
        const txCatId = tx.categoryId || tx.category?.id;
        if (String(txCatId) !== String(filters.categoryId)) return false;
      }

      // Year
      if (filters.year !== 'Tüm Yıllar') {
        const txDateStr = tx.transactionDate || tx.date || tx.createdAt;
        if (!txDateStr) return false;
        const txYear = new Date(txDateStr).getFullYear().toString();
        if (txYear !== filters.year) return false;
      }
      
      // Account / Merchant (Ödeme Yeri)
      if (filters.accountId !== 'Tümü') {
        const txAccountId = tx.accountId || tx.merchantId || tx.account?.id || tx.merchant?.id;
        if (String(txAccountId) !== String(filters.accountId)) return false;
      }

      // Basic Vade (Date) filtering
      if (filters.vade) {
        const txDateStr = tx.transactionDate || tx.date || tx.createdAt;
        if (!txDateStr) return false;
        
        const txDate = new Date(txDateStr);
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const txTime = txDate.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (filters.vade === 'Bugün') {
           if (txTime < startOfToday || txTime >= startOfToday + oneDayMs) return false;
        } else if (filters.vade === 'Bu Hafta') {
           const startOfWeek = startOfToday - (today.getDay() * oneDayMs);
           if (txTime < startOfWeek) return false;
        } else if (filters.vade === 'Bu Ay') {
           if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
        } else if (filters.vade === 'Geçen Ay') {
           const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
           const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
           if (txDate.getMonth() !== lastMonth || txDate.getFullYear() !== lastMonthYear) return false;
        } else if (filters.vade === '15 Gün') {
           if (txTime < startOfToday - (15 * oneDayMs)) return false;
        } else if (filters.vade === 'Geçmiş') {
           if (txTime >= startOfToday) return false;
        }
      }

      // Advanced Date filtering (Start/End)
      if (filters.startDate || filters.endDate) {
        const txDateStr = tx.transactionDate || tx.date || tx.createdAt;
        if (!txDateStr) return false;
        const txTime = new Date(txDateStr).getTime();
        
        if (filters.startDate) {
          const start = new Date(filters.startDate).getTime();
          if (txTime < start) return false;
        }
        if (filters.endDate) {
          // Set to end of the day for the end date
          const endObj = new Date(filters.endDate);
          endObj.setHours(23, 59, 59, 999);
          const end = endObj.getTime();
          if (txTime > end) return false;
        }
      }
      
      return true;
    });
  }, [transactions, filters, categories]);

  const paginatedTransactions = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totals = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    
    filteredTransactions.forEach(tx => {
      if (tx.type === 'INCOME') {
        income += Number(tx.amount || 0);
      } else {
        expense += Number(tx.amount || 0);
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [expRes, incRes, accRes, catRes, merRes] = await Promise.all([
        fetchApi<any>('/expenses'),
        fetchApi<any>('/incomes'),
        fetchApi<any>('/accounts'),
        fetchApi<any>('/categories'),
        fetchApi<any>('/merchants').catch(() => []) // Catch in case endpoint is missing
      ]);

      const expArray = Array.isArray(expRes) ? expRes : (expRes.items || expRes.data || []);
      const incArray = Array.isArray(incRes) ? incRes : (incRes.items || incRes.data || []);
      const accArray = Array.isArray(accRes) ? accRes : (accRes.items || accRes.data || []);
      const catArray = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      const merArray = Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []);

      const expList = expArray.map((t: any) => ({ ...t, type: 'EXPENSE' }));
      const incList = incArray.map((t: any) => ({ ...t, type: 'INCOME' }));
      
      // Merge and sort descending by date
      const allTx = [...expList, ...incList].sort((a, b) => new Date(b.transactionDate || b.date).getTime() - new Date(a.transactionDate || a.date).getTime());

      const populatedTx = allTx.map((tx: any) => ({
        ...tx,
        category: catArray.find((c: any) => c.id === tx.categoryId),
        merchant: merArray.find((m: any) => m.id === tx.merchantId),
        account: accArray.find((a: any) => a.id === tx.accountId)
      }));

      setTransactions(populatedTx);
      setAccounts(accArray);
      setCategories(catArray);
      setMerchants(merArray);
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check for transferred expense from Fatura / Fiş Scanner
    try {
      const stored = sessionStorage.getItem('transferred_expense');
      if (stored) {
        const data = JSON.parse(stored);
        sessionStorage.removeItem('transferred_expense');
        setInitialTxData({
          type: 'EXPENSE',
          amount: data.amount || data.totalAmount || '',
          transactionDate: data.transactionDate || data.invoiceDate || new Date().toISOString(),
          description:
            data.description ||
            (data.vendorName
              ? `${data.vendorName}${data.invoiceNumber ? ` (Fatura No: ${data.invoiceNumber})` : ''}`
              : 'Fatura Harcaması'),
          vendorName: data.vendorName || '',
          merchantId: data.merchantId || '',
          categoryId: data.categoryId || '',
          fromInvoice: true,
        });
        setEditingTx(null);
        setIsModalOpen(true);
        toast('Fatura verileri aktarıldı. Bilgileri kontrol edip kaydedebilirsiniz.', {
          icon: '🧾',
          duration: 5000,
        });
      }
    } catch (e) {
      console.error('Error reading transferred expense', e);
    }
  }, []);

  // handleSubmit is now handled by QuickAddModal

  const handleEdit = (tx: any) => {
    setInitialTxData(null);
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, type: string) => {
    const ok = await confirm({
      title: 'İşlemi Sil',
      message: 'Bu harcama/gelir kaydını silmek istediğinize emin misiniz? Bütçe ve hesap bakiyeniz güncellenecektir.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const endpoint = type === 'EXPENSE' ? `/expenses/${id}` : `/incomes/${id}`;
      await fetchApi(endpoint, { method: 'DELETE' });
      toast.success('İşlem silindi');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) {
      toast.error('Dışa aktarılacak işlem bulunamadı');
      return;
    }
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('İşlemler');
      
      worksheet.columns = [
        { header: 'Tarih', key: 'date', width: 15 },
        { header: 'Harcama Yeri', key: 'merchant', width: 25 },
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Açıklama', key: 'description', width: 30 },
        { header: 'Gelir', key: 'income', width: 15 },
        { header: 'Gider', key: 'expense', width: 15 }
      ];

      filteredTransactions.forEach(tx => {
        worksheet.addRow({
          date: new Date(tx.transactionDate || tx.date).toLocaleDateString('tr-TR'),
          merchant: tx.merchant?.name || tx.source || tx.account?.name || '-',
          category: tx.category?.name || categories.find(c => c.id === tx.categoryId)?.name || 'Kategorisiz',
          description: tx.description || '-',
          income: tx.type === 'INCOME' ? Number(tx.amount) : null,
          expense: tx.type === 'EXPENSE' ? Number(tx.amount) : null
        });
      });

      // Enable filtering for the headers (A1 to F1)
      worksheet.autoFilter = 'A1:F1';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `islemler_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel dosyası indirildi');
    } catch(e) {
      console.error(e);
      toast.error('Excel oluşturulurken hata oluştu');
    }
  };

  const handleExportPDF = async () => {
    let toastId;
    try {
      toastId = toast.loading('PDF hazırlanıyor, lütfen bekleyin...');
      const doc = new jsPDF();
      
      try {
        const fontUrl = '/fonts/Roboto-Regular.ttf';
        const fontResponse = await fetch(fontUrl);
        const fontBuffer = await fontResponse.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(fontBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Font = window.btoa(binary);
        
        doc.addFileToVFS('Roboto-Regular.ttf', base64Font);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal', 'Identity-H');
        doc.setFont('Roboto');
      } catch (fontError) {
        console.error('Font loading error:', fontError);
      }
      
      doc.setFontSize(18);
      doc.text('İşlemler Raporu', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);

      const headers = [['Tarih', 'Harcama Yeri', 'Kategori', 'Açıklama', 'Gelir', 'Gider']];
      const data = filteredTransactions.map(tx => {
        const date = new Date(tx.transactionDate || tx.date).toLocaleDateString('tr-TR');
        const merchant = tx.merchant?.name || tx.source || tx.account?.name || '-';
        const category = tx.category?.name || categories.find(c => c.id === tx.categoryId)?.name || 'Kategorisiz';
        const description = tx.description || '-';
        const gelir = tx.type === 'INCOME' ? 
          new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.amount) : '-';
        const gider = tx.type === 'EXPENSE' ? 
          new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.amount) : '-';
        
        return [date, merchant, category, description, gelir, gider];
      });

      autoTable(doc, {
        startY: 36,
        head: headers,
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], font: 'Roboto' }, // Indigo 500
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
      });

      doc.save(`islemler_${new Date().toISOString().split('T')[0]}.pdf`);
      if (toastId) toast.dismiss(toastId);
      toast.success('PDF dosyası başarıyla indirildi');
    } catch (e: any) {
      console.error(e);
      if (toastId) toast.dismiss(toastId);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };
  
  const handleImport = () => {
    setIsImportModalOpen(true);
  };
  
  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.error('Lütfen önce bir dosya seçin');
      return;
    }
    
    setLoading(true);
    try {
      const buffer = await importFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      
      let successCount = 0;
      
      const generateInstallmentsId = () => Math.random().toString(36).substring(2, 15);

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const rawDate = row.getCell(1).value;
        const rawType = row.getCell(2).value?.toString()?.toLowerCase();
        const rawMerchant = row.getCell(3).value?.toString();
        const rawCategory = row.getCell(4).value?.toString();
        const rawAmount = row.getCell(5).value;
        const rawDesc = row.getCell(6).value?.toString();
        const rawInstallment = row.getCell(7).value;

        if (!rawType || !rawAmount) continue;

        let dateStr = new Date().toISOString();
        if (rawDate instanceof Date) {
          dateStr = rawDate.toISOString();
        } else if (typeof rawDate === 'string') {
          try {
            dateStr = new Date(rawDate.split('.').reverse().join('-')).toISOString();
          } catch(e) {}
        }
        
        const type = rawType.includes('gider') ? 'expense' : 'income';
        const parsedAmount = Number(rawAmount);
        const count = Number(rawInstallment) || 1;
        
        let merchantId = merchants.find(m => m.name === rawMerchant)?.id || null;
        let categoryId = categories.find(c => c.name === rawCategory)?.id || null;

        let payloads: any[] = [];
        if (count > 1) {
          const installmentAmount = parsedAmount / count;
          const planId = generateInstallmentsId();
          
          for (let j = 0; j < count; j++) {
            const installmentDate = new Date(dateStr);
            installmentDate.setMonth(installmentDate.getMonth() + j);
            
            payloads.push({
              amount: installmentAmount,
              categoryId: categoryId || null,
              transactionDate: installmentDate.toISOString(),
              description: rawDesc ? `${rawDesc} (${j+1}. Taksit / ${count})` : `Taksit ${j+1}/${count}`,
              _planId: planId,
            });
          }
        } else {
          payloads.push({
            amount: parsedAmount,
            categoryId: categoryId || null,
            transactionDate: dateStr,
            description: rawDesc || null,
          });
        }

        if (type === 'expense') {
          for (const payload of payloads) {
            const { _planId, ...rest } = payload;
            const finalPayload = { ...rest, merchantId, accountId: null };
            if (_planId) finalPayload.installmentPlanId = _planId;
            await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        } else {
          for (const payload of payloads) {
            const { _planId, ...rest } = payload;
            const finalPayload = { ...rest, accountId: merchantId, source: rawMerchant || null };
            if (_planId) finalPayload.parentId = _planId;
            await fetchApi('/incomes', { method: 'POST', body: JSON.stringify(finalPayload) });
          }
        }
        successCount++;
      }
      
      toast.success(`${successCount} işlem başarıyla yüklendi`);
      setImportFile(null);
      setIsImportModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Dosya işlenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Gelir-Gider Ekleme');
      
      // Add headers
      sheet.columns = [
        { header: 'Tarih (GG.AA.YYYY)', key: 'date', width: 20 },
        { header: 'Tür (Gelir/Gider)', key: 'type', width: 20 },
        { header: 'Harcama Yeri', key: 'merchant', width: 25 },
        { header: 'Kategori', key: 'category', width: 25 },
        { header: 'Tutar (₺)', key: 'amount', width: 15 },
        { header: 'Açıklama', key: 'desc', width: 35 },
        { header: 'Taksit Sayısı (İsteğe Bağlı)', key: 'installments', width: 25 },
      ];
      
      // Header styling (like screenshot: blue bg, white text, bold)
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF6366F1' } // Indigo 500 for matching UI
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Hidden sheet for data validation lists
      const hiddenSheet = workbook.addWorksheet('DataLists', { state: 'hidden' });
      hiddenSheet.getColumn(1).values = ['Gelir', 'Gider'];
      
      // Use merchants instead of accounts for Harcama Yeri
      const merchantNames = merchants.map(m => m.name).filter(Boolean);
      hiddenSheet.getColumn(2).values = merchantNames.length > 0 ? merchantNames : ['-'];
      
      const categoryNames = categories.map(c => c.name).filter(Boolean);
      hiddenSheet.getColumn(3).values = categoryNames.length > 0 ? categoryNames : ['-'];

      const acctCount = merchantNames.length || 1;
      const catCount = categoryNames.length || 1;

      // Apply data validation to 1000 rows
      for (let i = 2; i <= 1000; i++) {
        // Type Validation (Col B)
        sheet.getCell(`B${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['DataLists!$A$1:$A$2']
        };
        
        // Merchant Validation (Col C)
        sheet.getCell(`C${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`DataLists!$B$1:$B$${acctCount}`]
        };

        // Category Validation (Col D)
        sheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`DataLists!$C$1:$C$${catCount}`]
        };
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gelir_gider_sablonu.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Şablon başarıyla indirildi');
    } catch (e: any) {
      console.error(e);
      toast.error('Şablon oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">İşlemler</h1>
          <p className="text-text-muted mt-1">{filteredTransactions.length} kayıt bulundu</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. TOPLAM GELİR (Green) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold">₺</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              TOPLAM GELİR
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight leading-tight truncate">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totals.income)}
            </div>
          </div>
        </div>

        {/* 2. TOPLAM GİDER (Red) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-rose-500">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold">₺</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              TOPLAM GİDER
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-500 tracking-tight leading-tight truncate">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totals.expense)}
            </div>
          </div>
        </div>

        {/* 3. NET BAKİYE (Blue/Gray) */}
        <div className={`bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] ${totals.balance >= 0 ? 'border-l-blue-500' : 'border-l-slate-500'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${totals.balance >= 0 ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'}`}>
            <span className="text-xl font-bold">₺</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              NET BAKİYE
            </span>
            <div className={`text-xl font-black tracking-tight leading-tight truncate ${totals.balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-slate-600 dark:text-slate-400'}`}>
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totals.balance)}
            </div>
          </div>
        </div>

        {/* 4. İŞLEM SAYISI (Purple) */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 dark:text-text-muted uppercase">
              İŞLEM SAYISI
            </span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-500 tracking-tight leading-tight truncate">
              {filteredTransactions.length} Adet
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Area */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Ara..." 
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full bg-bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          
          <div className="relative">
            <Button 
              variant="secondary" 
              className={`px-3 h-9 transition-colors ${isFiltersOpen ? 'bg-indigo-500 text-text-primary' : ''}`}
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreler
            </Button>
            
            {isFiltersOpen && (
              <div className="absolute left-0 lg:left-0 top-full mt-2 w-[320px] bg-bg-card border border-border rounded-xl shadow-2xl z-50 p-5">
                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider">VADE</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-3">
                    {['Geçmiş', 'Geçen Ay', 'Geçen 3 Ay', 'Geçen Çeyrek', 'Bugün', 'Bu Hafta', 'Bu Ay', 'Bu Çeyrek', '15 Gün', 'Gelecek 3 Ay'].map(vade => (
                      <button 
                        key={vade} 
                        onClick={() => setFilters(f => ({ ...f, vade: f.vade === vade ? '' : vade }))}
                        className={`text-[15px] transition-colors text-left ${filters.vade === vade ? 'text-accent font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        {vade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-2 uppercase tracking-wider">KATEGORİ</div>
                  <select 
                    value={filters.categoryId}
                    onChange={(e) => setFilters(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="Tümü">Tümü</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-5">
                  <div className="text-[11px] font-bold text-text-muted mb-2 uppercase tracking-wider">HARCAMA YERİ</div>
                  <select 
                    value={filters.accountId}
                    onChange={(e) => setFilters(f => ({ ...f, accountId: e.target.value }))}
                    className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="Tümü">Tümü</option>
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="h-px bg-border my-4 -mx-5"></div>

                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center text-sm font-medium text-text-primary hover:text-accent transition-colors w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Gelişmiş Filtreler
                </button>

                {showAdvancedFilters && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-border">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase tracking-wider">Başlangıç Tarihi</label>
                      <input 
                        type="date" 
                        value={filters.startDate}
                        onChange={(e) => {
                          setFilters({ ...filters, startDate: e.target.value });
                          setCurrentPage(1);
                        }}
                        className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1 uppercase tracking-wider">Bitiş Tarihi</label>
                      <input 
                        type="date" 
                        value={filters.endDate}
                        onChange={(e) => {
                          setFilters({ ...filters, endDate: e.target.value });
                          setCurrentPage(1);
                        }}
                        className="w-full bg-bg-sidebar border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
          <Button 
            onClick={() => {
              setEditingTx(null);
              setInitialTxData(null);
              setIsModalOpen(true);
            }} 
            className="px-3 bg-indigo-500 hover:bg-indigo-600 text-white h-9"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni İşlem
          </Button>
          <Button onClick={handleImport} variant="secondary" className="px-3 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-transparent h-9">
            <Upload className="w-4 h-4 mr-2" />
            İçe Aktar
          </Button>
          <Button onClick={handleExportExcel} variant="secondary" className="px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-transparent h-9">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handleExportPDF} variant="secondary" className="px-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-transparent h-9">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <div className="bg-bg-card border border-border p-1.5 rounded-lg flex items-center px-2 h-9 ml-2">
            <select 
              className="bg-transparent text-sm border-none focus:ring-0 text-text-primary outline-none"
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
            >
              <option value="Tüm Yıllar">Tüm Yıllar</option>
              {Array.from(new Set(transactions.map(t => new Date(t.transactionDate || t.date || t.createdAt).getFullYear()))).filter(y => !isNaN(y)).sort().reverse().map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Table Area */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-sidebar text-text-muted font-medium border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Tarih</th>
                <th className="px-4 py-2.5">Harcama Yeri</th>
                <th className="px-4 py-2.5">Kategori</th>
                <th className="px-4 py-2.5">Açıklama</th>
                <th className="px-4 py-2.5 text-center">Gelir</th>
                <th className="px-4 py-2.5 text-center">Gider</th>
                <th className="px-4 py-2.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">Yükleniyor...</td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    Henüz işlem bulunmuyor.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-bg-sidebar/50 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                      {new Date(tx.transactionDate || tx.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center text-text-primary font-medium">
                        {tx.merchant?.name || tx.source || tx.account?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-bg-sidebar text-text-secondary border border-border">
                        {tx.category?.name || categories.find(c => c.id === tx.categoryId)?.name || 'Kategorisiz'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary max-w-xs truncate">
                      {tx.description || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold">
                      {tx.type === 'INCOME' ? (
                        <span className="text-emerald-500">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: tx.currency || 'TRY' }).format(tx.amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold">
                      {tx.type === 'EXPENSE' ? (
                        <span className="text-rose-500">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: tx.currency || 'TRY' }).format(tx.amount)}
                        </span>
                      ) : (
                        <span className="text-rose-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 text-text-muted">
                        <button onClick={() => handleEdit(tx)} className="p-1.5 hover:text-text-primary hover:bg-bg-sidebar rounded-md transition-colors" title="Düzenle">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tx.id, tx.type)} className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors" title="Sil">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-muted">
            <div className="flex items-center gap-4">
              <span>
                {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} / {filteredTransactions.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded hover:bg-bg-sidebar disabled:opacity-50 disabled:hover:bg-transparent"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded hover:bg-bg-sidebar disabled:opacity-50 disabled:hover:bg-transparent"
              >
                &lsaquo;
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                        currentPage === pageNum 
                          ? 'bg-blue-500 text-white font-bold shadow-sm' 
                          : 'hover:bg-bg-sidebar text-text-primary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded hover:bg-bg-sidebar disabled:opacity-50 disabled:hover:bg-transparent"
              >
                &rsaquo;
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded hover:bg-bg-sidebar disabled:opacity-50 disabled:hover:bg-transparent"
              >
                &raquo;
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-bg-sidebar border border-border rounded px-2 py-1 outline-none text-text-primary"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        {filteredTransactions.length > 0 && (
          <div className="p-4 border-t border-border flex flex-wrap items-center justify-start gap-x-8 gap-y-2 text-sm bg-bg-sidebar/30 rounded-b-xl">
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-semibold uppercase text-xs tracking-wider">Toplam Gelir</span>
              <span className="text-emerald-500 font-bold text-base">₺{totals.income.toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-semibold uppercase text-xs tracking-wider">Toplam Gider</span>
              <span className="text-red-500 font-bold text-base">₺{totals.expense.toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-semibold uppercase text-xs tracking-wider">Kalan</span>
              <span className={`font-bold text-base ${totals.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ₺{totals.balance.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
        )}
      </Card>

      <QuickAddModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
          setInitialTxData(null);
        }}
        onSuccess={loadData}
        editData={editingTx}
        initialData={initialTxData}
      />

      {/* Import Modal */}
      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        title="Excel ile Gelir/Gider Ekle"
      >
        <div className="space-y-6">
          {/* Download Template Section */}
          <div className="bg-bg-sidebar/50 border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-text-primary mb-2">1. Güncel Şablonu İndirin</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
              Sistemdeki güncel kategorileriniz ve harcama yerleriniz Excel şablonuna otomatik olarak açılır liste şeklinde eklenir. Taksitli işlemler için <strong className="font-semibold text-text-primary">Taksit Sayısı</strong> sütununu doldurabilirsiniz.
            </p>
            <Button variant="secondary" className="w-auto px-4 bg-bg-card border-border shadow-sm text-text-primary font-medium" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Şablonu İndir (.xlsx)
            </Button>
          </div>

          {/* Upload Template Section */}
          <div className="bg-bg-sidebar/50 border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-text-primary mb-2">2. Doldurduğunuz Şablonu Yükleyin</h3>
            <p className="text-[13px] text-text-secondary mb-4">
              Doldurduğunuz Excel dosyasını seçin ve yükleyin.
            </p>
            
            <div 
              className="border-2 border-dashed border-border rounded-xl bg-bg-card p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent hover:bg-bg-sidebar transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImportFile(file);
                }}
              />
              <Upload className="w-6 h-6 text-text-primary mb-3" />
              {importFile ? (
                <div className="text-sm font-medium text-accent">{importFile.name} seçildi</div>
              ) : (
                <>
                  <div className="text-sm font-medium text-text-primary mb-1">Dosya Seçin veya Sürükleyin</div>
                  <div className="text-[13px] text-text-muted">Yalnızca .xlsx veya .xls dosyaları</div>
                </>
              )}
            </div>
          </div>
          
          <div className="pt-2 flex justify-end gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              className="px-6 border border-border"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
              }}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              className="px-6 bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={handleImportSubmit}
            >
              Verileri İçe Aktar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
