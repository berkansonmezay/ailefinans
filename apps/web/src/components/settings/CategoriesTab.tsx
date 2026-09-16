'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { Plus, Tag, ArrowUpCircle, ArrowDownCircle, Trash2, Edit2, Search, Upload, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isSystem: boolean;
}

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const [incomePage, setIncomePage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Kategori Adı': 'Market Alışverişi', 'Tür': 'Gider' },
      { 'Kategori Adı': 'Ek Gelir', 'Tür': 'Gelir' },
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Kategoriler');
    xlsx.writeFile(wb, 'kategori_sablonu.xlsx');
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.error('Lütfen önce bir dosya seçin');
      return;
    }

    try {
      setIsImporting(true);
      const data = await importFile.arrayBuffer();
      const workbook = xlsx.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        toast.error('Excel dosyası boş veya okunamadı.');
        return;
      }

      // Map excel rows to category DTOs
      const dtos = jsonData.map(row => {
        const name = row['Kategori Adı'] || row['Ad'] || row['Name'] || row['Kategori'] || '';
        const typeStr = (row['Tür'] || row['Tip'] || row['Type'] || 'Gider').toString().toLowerCase();
        const type = (typeStr === 'gelir' || typeStr === 'income') ? 'INCOME' : 'EXPENSE';
        
        return { name: name.toString().trim(), type };
      }).filter(dto => dto.name); // Filter out empty names

      if (dtos.length === 0) {
        toast.error('Geçerli bir kategori bulunamadı. Sütun isimlerini kontrol edin (Örn: "Kategori Adı", "Tür").');
        return;
      }

      const res = await fetchApi<any>('/categories/bulk', {
        method: 'POST',
        body: JSON.stringify(dtos),
      });

      toast.success(res.message || `${dtos.length} kategori başarıyla içe aktarıldı`);
      setIsImportModalOpen(false);
      setImportFile(null);
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Excel dosyası işlenirken hata oluştu');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportExcel = async () => {
    if (categories.length === 0) {
      toast.error('Dışa aktarılacak kategori bulunamadı');
      return;
    }
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Kategoriler');
      
      worksheet.columns = [
        { header: 'Ad', key: 'name', width: 25 },
        { header: 'Tür', key: 'type', width: 15 },
        { header: 'Sistem Kategorisi', key: 'isSystem', width: 20 }
      ];

      categories.forEach(cat => {
        worksheet.addRow({
          name: cat.name,
          type: cat.type === 'EXPENSE' ? 'Gider' : 'Gelir',
          isSystem: cat.isSystem ? 'Evet' : 'Hayır'
        });
      });

      worksheet.autoFilter = 'A1:C1';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kategoriler_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      if (categories.length === 0) {
        toast.error('Dışa aktarılacak kategori bulunamadı');
        return;
      }
      toastId = toast.loading('PDF hazırlanıyor...');
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
      doc.text('Kategoriler Raporu', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);

      const headers = [['Ad', 'Tür', 'Sistem Kategorisi']];
      const data = categories.map(cat => [
        cat.name,
        cat.type === 'EXPENSE' ? 'Gider' : 'Gelir',
        cat.isSystem ? 'Evet' : 'Hayır'
      ]);

      autoTable(doc, {
        startY: 36,
        head: headers,
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], font: 'Roboto' },
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
      });

      doc.save(`kategoriler_${new Date().toISOString().split('T')[0]}.pdf`);
      if (toastId) toast.dismiss(toastId);
      toast.success('PDF başarıyla indirildi');
    } catch (e: any) {
      console.error(e);
      if (toastId) toast.dismiss(toastId);
      toast.error('PDF oluşturulurken hata oluştu');
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
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-bg-card p-3 rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Kategori ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 w-full sm:w-64 transition-all"
            />
          </div>
        </div>
          
        <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExportExcel} variant="secondary" className="px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-transparent h-9">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button onClick={handleExportPDF} variant="secondary" className="px-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-transparent h-9">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)} disabled={isImporting} className="h-9">
              <Upload className="w-4 h-4 mr-2" />
              İçe Aktar
            </Button>
            <Button onClick={openNewModal} className="h-9">
              <Plus className="w-4 h-4 mr-2" />
              Yeni
            </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gider Kategorileri */}
        <section className="space-y-3">
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
                    <li key={cat.id} className="flex justify-between items-center px-3 py-1.5 bg-bg-card hover:bg-bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-text-muted" />
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
        </section>

        {/* Gelir Kategorileri */}
        <section className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
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
                    <li key={cat.id} className="flex justify-between items-center px-3 py-1.5 bg-bg-card hover:bg-bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-text-muted" />
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
        </section>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Kategori Düzenle" : "Yeni Kategori Ekle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Kategori Adı" 
            placeholder="Örn: Mutfak Masrafları" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            className={formData.type === 'EXPENSE' ? 'focus:!border-[#e53e3e] focus:!ring-[#e53e3e]/50' : 'focus:!border-[#10b981] focus:!ring-[#10b981]/50'}
          />
          <Select 
            label="Kategori Türü"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            className={formData.type === 'EXPENSE' ? '!border-[#e53e3e] focus:!border-[#e53e3e] focus:!ring-[#e53e3e]/50' : '!border-[#10b981] focus:!border-[#10b981] focus:!ring-[#10b981]/50'}
            options={[
              { value: 'EXPENSE', label: 'Gider' },
              { value: 'INCOME', label: 'Gelir' },
            ]}
          />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              İptal
            </Button>
            <Button 
              type="submit"
              className={formData.type === 'EXPENSE' 
                ? '!bg-[#e53e3e] !text-white hover:!bg-[#c53030] !shadow-[0_0_20px_rgba(229,62,62,0.3)] hover:!shadow-[0_0_25px_rgba(229,62,62,0.5)]' 
                : '!bg-[#10b981] !text-white hover:!bg-[#059669] !shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:!shadow-[0_0_25px_rgba(16,185,129,0.5)]'}
            >
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        title="Excel ile Kategori Ekle"
      >
        <div className="space-y-6">
          {/* Download Template Section */}
          <div className="bg-bg-sidebar/50 border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-text-primary mb-2">1. Örnek Şablonu İndirin</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
              Kategorilerinizi toplu olarak eklemek için örnek Excel şablonunu indirin ve doldurun. Sütun isimlerini değiştirmeyin.
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
              disabled={isImporting}
            >
              {isImporting ? 'Yükleniyor...' : 'Verileri İçe Aktar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
