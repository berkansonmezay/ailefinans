"use client";

import { useState, useEffect, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Receipt,
  ShieldCheck,
  Calendar,
  Building2,
  Tag,
  CreditCard,
  Hash,
  Laptop,
  ArrowRight,
  Sparkles,
  FolderTree,
  Store,
  X,
  FileCode,
  Shield,
  Package,
  Wrench,
  ClipboardList,
  Clock,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchApi } from "@/lib/api";

export default function FaturaUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<"invoice" | "warranty">("invoice");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [catRes, merRes] = await Promise.all([
        fetchApi<any>("/categories").catch(() => []),
        fetchApi<any>("/merchants").catch(() => []),
      ]);
      const cats = Array.isArray(catRes) ? catRes : (catRes.items || catRes.data || []);
      const mers = Array.isArray(merRes) ? merRes : (merRes.items || merRes.data || []);
      setCategories(cats);
      setMerchants(mers);
    } catch (e) {
      console.error("Option loading error", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setFormData(null);
    const data = new FormData();
    data.append("file", file);
    data.append("documentType", documentType);

    try {
      const res = await fetch("http://localhost:4000/api/v1/invoices/extract", {
        method: "POST",
        body: data,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
      });

      if (!res.ok) {
        throw new Error("Sunucu hatası.");
      }

      const json = await res.json();
      if (json.success) {
        const extracted = json.data;
        if (extracted.vendorName && merchants.length > 0) {
          const vClean = extracted.vendorName.trim().toLowerCase();
          const matched = merchants.find((m: any) =>
            m.name.toLowerCase().includes(vClean) || vClean.includes(m.name.toLowerCase())
          );
          if (matched) {
            extracted.merchantId = matched.id;
          }
        }
        setFormData(extracted);
        toast.success(
          documentType === "invoice"
            ? "Fatura verileri başarıyla çıkarıldı!"
            : "Garanti belgesi verileri başarıyla çıkarıldı!"
        );
      } else {
        throw new Error(json.message || "Bilinmeyen hata");
      }
    } catch (error) {
      console.error(error);
      toast.error("Dosya işlenirken hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferToModule = () => {
    if (!formData) return;

    if (documentType === "invoice") {
      if (!formData.merchantId) {
        return toast.error("Kayıt tamamlanamaz: Lütfen Harcama Yeri (Mağaza/Kurum) seçiniz.");
      }
      if (!formData.categoryId) {
        return toast.error("Kayıt tamamlanamaz: Lütfen bir Harcama Kategorisi seçiniz.");
      }

      const payload = {
        amount: parseFloat(formData.totalAmount) || 0,
        transactionDate: formData.invoiceDate || new Date().toISOString().split("T")[0],
        vendorName: formData.vendorName || "",
        merchantId: formData.merchantId,
        categoryId: formData.categoryId,
        invoiceNumber: formData.invoiceNumber || "",
        description: `${formData.vendorName || "Fatura"} Harcaması`,
      };
      sessionStorage.setItem("transferred_expense", JSON.stringify(payload));
      toast.success("Veriler gider ekleme sayfasına aktarılıyor...");
      router.push("/transactions");
    } else {
      const payload = {
        productName: formData.productName || "Elektronik Ürün",
        brand: formData.brand || formData.vendorName || "",
        model: formData.model || "",
        serialNumber: formData.serialNumber || "",
        purchaseDate: formData.purchaseDate || formData.invoiceDate || new Date().toISOString().split("T")[0],
        purchasePrice: parseFloat(formData.purchasePrice || formData.totalAmount) || null,
        warrantyStartDate: formData.purchaseDate || formData.invoiceDate || new Date().toISOString().split("T")[0],
        warrantyEndDate: formData.warrantyEndDate || "",
        purchasePlace: formData.vendorName || formData.brand || "",
        warrantyType: "MANUFACTURER",
      };
      sessionStorage.setItem("transferred_warranty", JSON.stringify(payload));
      toast.success("Veriler garanti kayıt sayfasına aktarılıyor...");
      router.push("/warranties");
    }
  };

  const handleFormChange = (key: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [key]: value };
      if (key === "purchaseDate" || key === "warrantyMonths") {
        const pDate = new Date(key === "purchaseDate" ? value : updated.purchaseDate);
        const months = Number(key === "warrantyMonths" ? value : updated.warrantyMonths) || 24;
        if (!isNaN(pDate.getTime())) {
          pDate.setMonth(pDate.getMonth() + months);
          updated.warrantyEndDate = pDate.toISOString().split("T")[0];
        }
      }
      return updated;
    });
  };

  const handleApprove = async () => {
    if (!formData) return;

    if (documentType === "invoice") {
      if (!formData.merchantId) {
        return toast.error("Kayıt tamamlanamaz: Lütfen Harcama Yeri (Mağaza/Kurum) seçiniz.");
      }
      if (!formData.categoryId) {
        return toast.error("Kayıt tamamlanamaz: Lütfen bir Harcama Kategorisi seçiniz.");
      }
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("access_token") || "";

      if (documentType === "invoice") {
        const expensePayload = {
          description: `${formData.vendorName || "Fatura"} Harcaması`,
          amount: parseFloat(formData.totalAmount) || 0,
          transactionDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: formData.invoiceNumber ? `Fatura No: ${formData.invoiceNumber}` : "",
          merchantId: formData.merchantId || null,
          categoryId: formData.categoryId || null,
        };

        const res = await fetch("http://localhost:4000/api/v1/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(expensePayload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Gider kaydedilemedi.");
        }

        toast.success("Fatura ve gider kaydı başarıyla oluşturuldu!");
      } else {
        const pDate = formData.purchaseDate || new Date().toISOString().split("T")[0];
        const wEnd = formData.warrantyEndDate || pDate;

        const warrantyPayload = {
          productName: formData.productName || "Elektronik Ürün",
          brand: formData.brand || formData.vendorName || "Bilinmiyor",
          model: formData.model || null,
          serialNumber: formData.serialNumber || null,
          purchaseDate: pDate,
          warrantyStartDate: pDate,
          warrantyEndDate: wEnd,
          purchasePrice: parseFloat(formData.purchasePrice || formData.totalAmount) || null,
          purchasePlace: formData.vendorName || formData.brand || "Mağaza",
          warrantyType: "MANUFACTURER",
        };

        const res = await fetch("http://localhost:4000/api/v1/warranties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(warrantyPayload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Garanti kaydı oluşturulamadı.");
        }

        toast.success("Garanti belgesi kaydı başarıyla oluşturuldu!");
      }

      setFormData(null);
      setFile(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Kayıt sırasında hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header (Exact styling from Garanti & Fatura page) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Akıllı Belge Tarama (AI OCR)</h1>
          <p className="text-text-muted mt-1">
            Fatura, fiş veya garanti belgenizi yükleyin; sistem bilgileri otomatik çıkarsın ve ilgili ekleme ekranına aktarsın.
          </p>
        </div>
      </div>

      {/* KPI Feature Cards - border-l-[5px] stili */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Akıllı OCR - Emerald */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Akıllı Ayrıştırma</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">PDF, Görsel ve Excel OCR</p>
            <p className="text-xs text-text-muted">Yapay zeka destekli metin çıkarma</p>
          </div>
        </div>

        {/* Aktarım Modu - Blue */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Aktarım Modu</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">
              {documentType === "invoice" ? "Gider Sayfası Aktarımı" : "Garanti Kayıt Aktarımı"}
            </p>
            <p className="text-xs text-text-muted">Uygun sayfaya otomatik yönlendirme</p>
          </div>
        </div>

        {/* Otomatik Eşleşme - Purple */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Otomatik Eşleşme</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">Kurum & Kategori Algılama</p>
            <p className="text-xs text-text-muted">Mevcut kayıtlarla eşleştirme</p>
          </div>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">AI Fatura & Belge Tarama Rehberi</h3>
              <p className="text-xs text-text-muted mt-0.5">4 adımda belgenizi sisteme kaydedin; yapay zeka gerisini halleder.</p>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 pt-1"
          >
            {showGuide ? "Gizle" : "Nasıl Çalışır?"}
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {showGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-500/20 text-xs text-text-secondary">
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">1. Belge Yükleme</span>
              PDF, JPG veya PNG belgenizi sürükleyip bırakın ya da dosya seçiciyle yükleyin.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">2. OCR Analizi</span>
              Yapay zeka belgeyi tarar; tutar, tarih, mağaza ve ürün bilgilerini otomatik çıkartır.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">3. Doğrulama</span>
              Çıkarılan verileri gözden geçirin; kategori ve harcama yerini onaylayın veya düzeltin.
            </div>
            <div className="bg-bg-card/60 dark:bg-bg-card/40 backdrop-blur-sm rounded-xl p-3 border border-border/50">
              <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">4. Kayıt</span>
              Tek tıkla gider veya garanti kaydı oluşturun; belge otomatik olarak sisteme eklenir.
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation (Exact styling from Garanti & Fatura page tabs) */}
      <div className="bg-bg-card border border-border rounded-2xl p-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => {
            setDocumentType("invoice");
            setFormData(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
            documentType === "invoice"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-sm"
              : "text-text-muted hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Fatura / Fiş Modu</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDocumentType("warranty");
            setFormData(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
            documentType === "warranty"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-sm"
              : "text-text-muted hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Garanti Belgesi Modu</span>
        </button>
      </div>

      {/* Stage Stepper Banner (Matching Garanti & Fatura rounded-2xl cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`bg-bg-card border rounded-2xl p-4 flex items-center gap-3 transition-all ${
            !formData ? "border-emerald-500/40 bg-emerald-500/10" : "border-border"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
              !formData ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-600 text-white"
            }`}
          >
            {!formData ? "1" : "✓"}
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">1. AŞAMA</p>
            <p className="text-sm font-bold text-text-primary">Belge Yükleme & OCR Ayrıştırma</p>
          </div>
        </div>

        <div
          className={`bg-bg-card border rounded-2xl p-4 flex items-center gap-3 transition-all ${
            formData ? "border-blue-500/40 bg-blue-500/10" : "border-border opacity-70"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
              formData ? "bg-blue-500/20 text-blue-400" : "bg-bg-secondary text-text-muted"
            }`}
          >
            2
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">2. AŞAMA</p>
            <p className="text-sm font-bold text-text-primary">
              {documentType === "invoice"
                ? "Gider Sayfasına Aktar (Kategori & Harcama Yeri Seç)"
                : "Garanti Sayfasına Aktar (Son Kontrol)"}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Dropzone Card (Matching Garanti & Fatura style) */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? "border-emerald-500 bg-emerald-500/10 scale-[0.99]"
              : "border-border hover:border-emerald-500/50 bg-bg-secondary/40 hover:bg-bg-secondary"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            onChange={handleFileChange}
          />
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3">
            <UploadCloud className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-text-primary">
            {documentType === "invoice"
              ? "Fatura veya Fiş Dosyası Sürükleyin ya da Seçin"
              : "Garanti Belgesi Sürükleyin ya da Seçin"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            PDF, PNG, JPG, JPEG veya Excel (.xlsx, .csv) formatları desteklenmektedir.
          </p>
        </div>

        {/* Selected File & Action Bar */}
        {file && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-bg-secondary rounded-xl border border-border animate-in fade-in">
            <div className="flex items-center space-x-3 min-w-0">
              <FileText className="h-6 w-6 text-emerald-400 flex-shrink-0" />
              <div className="truncate">
                <p className="text-sm font-semibold text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFormData(null);
                }}
                className="p-2 text-text-muted hover:text-rose-400 rounded-xl hover:bg-bg-card transition-colors"
                title="Dosyayı Kaldır"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 text-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">🌀</span>
                    <span>Analiz Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Verileri Otomatik Çıkar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extracted Data Form (Stage 1 Completed) */}
      {formData && (
        <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-2.5">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <h2 className="text-base font-bold text-text-primary">
                {documentType === "invoice" ? "1. Aşama: Çıkarılan Fatura Verileri" : "1. Aşama: Çıkarılan Garanti Verileri"}
              </h2>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium border border-emerald-500/20">
              {documentType === "invoice" ? "Fatura / Fiş Modu" : "Garanti Belgesi Modu"}
            </span>
          </div>

          {/* Invoice / Receipt Form Fields */}
          {documentType === "invoice" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Building2 className="h-4 w-4" /> Satıcı / Kurum Adı (OCR)
                </label>
                <input
                  type="text"
                  value={formData.vendorName || ""}
                  onChange={(e) => handleFormChange("vendorName", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-primary">
                  <Store className="h-4 w-4 text-emerald-400" /> Harcama Yeri / Mağaza <span className="text-rose-500 font-bold">* Zorunlu</span>
                </label>
                <select
                  value={formData.merchantId || ""}
                  onChange={(e) => handleFormChange("merchantId", e.target.value)}
                  className={`w-full bg-bg-secondary border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all ${
                    !formData.merchantId ? 'border-rose-500/40 bg-rose-500/[0.02]' : 'border-border'
                  }`}
                >
                  <option value="">-- Harcama Yeri Seçin (Zorunlu) --</option>
                  {merchants.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {!formData.merchantId && (
                  <p className="text-[11px] text-rose-500 font-medium">Kayıt için harcama yeri seçimi zorunludur.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-primary">
                  <FolderTree className="h-4 w-4 text-emerald-400" /> Harcama Kategorisi <span className="text-rose-500 font-bold">* Zorunlu</span>
                </label>
                <select
                  value={formData.categoryId || ""}
                  onChange={(e) => handleFormChange("categoryId", e.target.value)}
                  className={`w-full bg-bg-secondary border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all ${
                    !formData.categoryId ? 'border-rose-500/40 bg-rose-500/[0.02]' : 'border-border'
                  }`}
                >
                  <option value="">-- Kategori Seçin (Zorunlu) --</option>
                  {categories
                    .filter((c: any) => c.type === "EXPENSE")
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                {!formData.categoryId && (
                  <p className="text-[11px] text-rose-500 font-medium">Kayıt için harcama kategorisi seçimi zorunludur.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Hash className="h-4 w-4" /> Fatura / Fiş No
                </label>
                <input
                  type="text"
                  placeholder="Örn: GBL2026000004589"
                  value={formData.invoiceNumber || ""}
                  onChange={(e) => handleFormChange("invoiceNumber", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Calendar className="h-4 w-4" /> Fatura Tarihi
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate || ""}
                  onChange={(e) => handleFormChange("invoiceDate", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <CreditCard className="h-4 w-4" /> Toplam Ödenecek Tutar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalAmount ?? ""}
                  onChange={(e) => handleFormChange("totalAmount", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-emerald-400 font-bold rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Warranty Document Form Fields */}
          {documentType === "warranty" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Laptop className="h-4 w-4" /> Ürün / Cihaz Adı
                </label>
                <input
                  type="text"
                  placeholder="Örn: MacBook Pro M3 veya Buzdolabı"
                  value={formData.productName || ""}
                  onChange={(e) => handleFormChange("productName", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Building2 className="h-4 w-4" /> Marka / Satıcı
                </label>
                <input
                  type="text"
                  value={formData.brand || formData.vendorName || ""}
                  onChange={(e) => {
                    handleFormChange("brand", e.target.value);
                    handleFormChange("vendorName", e.target.value);
                  }}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Tag className="h-4 w-4" /> Model No
                </label>
                <input
                  type="text"
                  placeholder="Örn: A2992 veya SKU-123"
                  value={formData.model || ""}
                  onChange={(e) => handleFormChange("model", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Hash className="h-4 w-4" /> Seri Numarası / IMEI
                </label>
                <input
                  type="text"
                  placeholder="Örn: C02XL198J123"
                  value={formData.serialNumber || ""}
                  onChange={(e) => handleFormChange("serialNumber", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Calendar className="h-4 w-4" /> Satın Alma Tarihi
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate || formData.invoiceDate || ""}
                  onChange={(e) => handleFormChange("purchaseDate", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Clock className="h-4 w-4" /> Garanti Süresi (Ay)
                </label>
                <input
                  type="number"
                  value={formData.warrantyMonths || 24}
                  onChange={(e) => handleFormChange("warrantyMonths", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-text-primary rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Calendar className="h-4 w-4" /> Garanti Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={formData.warrantyEndDate || ""}
                  onChange={(e) => handleFormChange("warrantyEndDate", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-emerald-400 font-semibold rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <CreditCard className="h-4 w-4" /> Satın Alma Tutarı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice || formData.totalAmount || ""}
                  onChange={(e) => handleFormChange("purchasePrice", e.target.value)}
                  className="w-full bg-bg-secondary border border-border text-emerald-400 font-bold rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Transfer & Action Footer Bar */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-text-muted flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span>Verileri kontrol ettikten sonra 2. aşama ekleme sayfasına aktarabilirsiniz.</span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="bg-bg-secondary hover:bg-bg-secondary/80 text-text-primary font-medium px-4 py-2.5 rounded-xl border border-border transition-all text-xs disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Bu Sayfada Hızlı Kaydet"}
              </button>

              <button
                type="button"
                onClick={handleTransferToModule}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 text-xs"
              >
                <span>
                  {documentType === "invoice"
                    ? "Gider Sayfasına Aktar (Kategori & Harcama Yeri Seç)"
                    : "Garanti Sayfasına Aktar (Son Kontrolleri Yap)"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
