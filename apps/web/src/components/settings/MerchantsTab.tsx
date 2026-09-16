'use client';

import React, { useEffect, useState } from 'react';
import * as xlsx from 'xlsx';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { Plus, Store, Edit2, Trash2, Phone, Globe, Upload, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Merchant {
  id: string;
  name: string;
  type: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
}

export function MerchantsTab() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
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

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Kurum Adı': 'Migros' },
      { 'Kurum Adı': 'Turkcell' },
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Kurumlar');
    xlsx.writeFile(wb, 'harcama_yerleri_sablonu.xlsx');
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

      const dtos = jsonData.map(row => {
        const name = row['Kurum Adı'] || row['Ad'] || row['Name'] || row['Kurum'] || '';
        
        return { 
          name: name.toString().trim(),
        };
      }).filter(dto => dto.name); 

      if (dtos.length === 0) {
        toast.error('Geçerli bir kurum bulunamadı. Sütun isimlerini kontrol edin (Örn: "Kurum Adı").');
        return;
      }

      const res = await fetchApi<any>('/merchants/bulk', {
        method: 'POST',
        body: JSON.stringify(dtos),
      });

      toast.success(res.message || `${dtos.length} kurum başarıyla içe aktarıldı`);
      setIsImportModalOpen(false);
      setImportFile(null);
      loadData();
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
    if (merchants.length === 0) {
      toast.error('Dışa aktarılacak kayıt bulunamadı');
      return;
    }
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Harcama Yerleri');
      
      worksheet.columns = [
        { header: 'İsim', key: 'name', width: 30 }
      ];

      merchants.forEach(m => {
        worksheet.addRow({
          name: m.name
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `harcama_yerleri_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      if (merchants.length === 0) {
        toast.error('Dışa aktarılacak kayıt bulunamadı');
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
      doc.text('Harcama Yerleri Raporu', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);

      const headers = [['İsim']];
      const data = merchants.map(m => [
        m.name
      ]);

      autoTable(doc, {
        startY: 36,
        head: headers,
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], font: 'Roboto' },
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
      });

      doc.save(`harcama_yerleri_${new Date().toISOString().split('T')[0]}.pdf`);
      if (toastId) toast.dismiss(toastId);
      toast.success('PDF başarıyla indirildi');
    } catch (e: any) {
      console.error(e);
      if (toastId) toast.dismiss(toastId);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 bg-bg-card p-3 rounded-xl border border-border">
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

      {loading ? (
        <p className="text-text-muted">Yükleniyor...</p>
      ) : merchants.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-bg-card rounded-2xl border border-border">
          <Store className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Henüz kayıt eklenmemiş</h3>
          <p className="text-text-muted">Alışveriş yaptığınız yerleri kaydederek giderlerinizi daha detaylı analiz edebilirsiniz.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-border bg-bg-card rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-sidebar/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 font-semibold text-text-secondary">İsim</th>
                  <th className="px-3 py-2 font-semibold text-text-secondary text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-bg-sidebar/50 transition-colors">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-500/20 text-blue-400 rounded-md">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-sm font-medium text-text-primary">{merchant.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(merchant)} className="p-1 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors" title="Düzenle">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(merchant.id)} className="p-1 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors" title="Sil">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

      {/* Import Modal */}
      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        title="Excel ile Harcama Yeri Ekle"
      >
        <div className="space-y-6">
          <div className="bg-bg-sidebar/50 border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-text-primary mb-2">1. Örnek Şablonu İndirin</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
              Harcama yerlerini toplu olarak eklemek için örnek Excel şablonunu indirin ve doldurun. Sütun isimlerini değiştirmeyin.
            </p>
            <Button variant="secondary" className="w-auto px-4 bg-bg-card border-border shadow-sm text-text-primary font-medium" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Şablonu İndir (.xlsx)
            </Button>
          </div>

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
