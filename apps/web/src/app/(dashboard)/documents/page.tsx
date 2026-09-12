'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { FileText, UploadCloud, Trash2, File, Image as ImageIcon, FileArchive, ArrowDownToLine } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/documents');
      setDocuments(Array.isArray(res) ? res : res.items || res.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Belgeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu 10MB\'dan küçük olmalıdır.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      // Note: Since we are using fetchApi helper which stringifies JSON by default, 
      // we need to use a standard fetch for FormData.
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Dosya yüklenemedi');
      }

      toast.success('Dosya başarıyla yüklendi');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;
    try {
      await fetchApi(`/documents/${id}`, { method: 'DELETE' });
      toast.success('Belge silindi');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Silinirken hata oluştu');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <ImageIcon className="w-6 h-6" />;
    if (fileType.includes('pdf')) return <FileText className="w-6 h-6" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <FileArchive className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Belgeler</h1>
          <p className="text-text-muted mt-1">Fatura, fiş, sözleşme ve evraklarınızı güvenle saklayın.</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <UploadCloud className="w-5 h-5 mr-2" />
          {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          <p className="text-text-muted col-span-full">Yükleniyor...</p>
        ) : documents.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-bg-card rounded-2xl border border-border border-dashed">
            <UploadCloud className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Henüz belge yüklenmemiş</h3>
            <p className="text-text-muted max-w-md mx-auto mb-6">Önemli evraklarınızı veya harcama fişlerinizi yükleyerek dijital arşivinizi oluşturmaya başlayın.</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Bilgisayardan Seç
            </Button>
          </div>
        ) : (
          documents.map(doc => (
            <Card key={doc.id} className="group border-border bg-bg-card backdrop-blur-xl hover:bg-bg-card transition-colors">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="w-full flex justify-end mb-2">
                  <button onClick={() => handleDelete(doc.id)} className="text-text-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-full mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  {getFileIcon(doc.fileType)}
                </div>
                
                <h3 className="text-sm font-bold text-text-primary leading-tight mb-1 truncate w-full" title={doc.fileName}>
                  {doc.fileName}
                </h3>
                <p className="text-xs text-text-muted">{formatFileSize(doc.fileSize)}</p>
                <p className="text-xs text-text-muted mt-2">{new Date(doc.createdAt).toLocaleDateString('tr-TR')}</p>
                
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
