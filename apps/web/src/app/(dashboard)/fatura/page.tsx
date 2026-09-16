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
      const payload = {
        amount: parseFloat(formData.totalAmount) || 0,
        transactionDate: formData.invoiceDate || new Date().toISOString().split("T")[0],
        vendorName: formData.vendorName || "",
        merchantId: formData.merchantId || "",
        categoryId: formData.categoryId || "",
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
        return toast.error("Lütfen Harcama Yeri (Mağaza/Kurum) seçiniz.");
      }
      if (!formData.categoryId) {
        return toast.error("Lütfen bir Harcama Kategorisi seçiniz.");
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
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header Card */}
      <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Akıllı Belge Tarama (AI OCR)</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Fatura, fiş veya garanti belgesi yükleyin; verileri otomatik çıkarıp ekleme ekranlarına aktarın.
            </p>
          </div>
        </div>

        {/* Document Type Switcher & Stages Header */}
        <div className="flex items-center gap-2 bg-bg-secondary p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setDocumentType("invoice");
              setFormData(null);
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              documentType === "invoice"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Fatura / Fiş</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDocumentType("warranty");
              setFormData(null);
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              documentType === "warranty"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Garanti Belgesi</span>
          </button>
        </div>
      </div>

      {/* Stage Stepper Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
            !formData
              ? "bg-primary/10 border-primary text-primary shadow-sm"
              : "bg-bg-card border-border text-text-muted"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              !formData ? "bg-primary text-primary-foreground" : "bg-emerald-600 text-white"
            }`}
          >
            {!formData ? "1" : "✓"}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">1. AŞAMA</p>
            <p className="text-xs font-semibold text-text-primary">Belge Yükleme & OCR Ayrıştırma</p>
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
            formData
              ? "bg-primary/10 border-primary text-primary shadow-sm"
              : "bg-bg-card border-border text-text-muted opacity-70"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              formData ? "bg-primary text-primary-foreground" : "bg-bg-secondary text-text-muted"
            }`}
          >
            2
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">2. AŞAMA</p>
            <p className="text-xs font-semibold text-text-primary">
              {documentType === "invoice"
                ? "Gider Sayfasına Aktar (Seçim Yap)"
                : "Garanti Sayfasına Aktar (Son Kontrol)"}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/10 scale-[0.99]"
              : "border-border hover:border-primary/50 bg-bg-secondary/40 hover:bg-bg-secondary/70"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            onChange={handleFileChange}
          />
          <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {documentType === "invoice"
              ? "Fatura veya Fiş Dosyası Sürükleyin ya da Seçin"
              : "Garanti Belgesi Sürükleyin ya da Seçin"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            PDF, PNG, JPG, JPEG veya Excel (.xlsx, .csv) dosyaları desteklenir
          </p>
        </div>

        {/* Selected File & Action Bar */}
        {file && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-bg-secondary rounded-lg border border-border animate-in fade-in">
            <div className="flex items-center space-x-2.5 min-w-0">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-text-primary truncate">{file.name}</p>
                <p className="text-[10px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFormData(null);
                }}
                className="p-1.5 text-text-muted hover:text-rose-500 rounded-lg hover:bg-bg-card transition-colors"
                title="Dosyayı Kaldır"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isProcessing}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm flex items-center space-x-1.5"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin text-xs">🌀</span>
                    <span>Analiz Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
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
        <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-bold text-text-primary">
                {documentType === "invoice" ? "1. Aşama: Çıkarılan Fatura Verileri" : "1. Aşama: Çıkarılan Garanti Verileri"}
              </h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {documentType === "invoice" ? "Fatura / Fiş Modu" : "Garanti Modu"}
            </span>
          </div>

          {/* Invoice / Receipt Form Fields */}
          {documentType === "invoice" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Building2 className="h-3.5 w-3.5" /> Satıcı / Kurum Adı (OCR)
                </label>
                <input
                  type="text"
                  value={formData.vendorName || ""}
                  onChange={(e) => handleFormChange("vendorName", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-primary">
                  <Store className="h-3.5 w-3.5 text-primary" /> Harcama Yeri / Mağaza <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.merchantId || ""}
                  onChange={(e) => handleFormChange("merchantId", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Harcama Yeri Seçin --</option>
                  {merchants.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-primary">
                  <FolderTree className="h-3.5 w-3.5 text-primary" /> Harcama Kategorisi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.categoryId || ""}
                  onChange={(e) => handleFormChange("categoryId", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Kategori Seçin --</option>
                  {categories
                    .filter((c: any) => c.type === "EXPENSE")
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Hash className="h-3.5 w-3.5" /> Fatura / Fiş No
                </label>
                <input
                  type="text"
                  placeholder="Örn: GBL2026000004589"
                  value={formData.invoiceNumber || ""}
                  onChange={(e) => handleFormChange("invoiceNumber", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Calendar className="h-3.5 w-3.5" /> Fatura Tarihi
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate || ""}
                  onChange={(e) => handleFormChange("invoiceDate", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <CreditCard className="h-3.5 w-3.5" /> Toplam Ödenecek Tutar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalAmount ?? ""}
                  onChange={(e) => handleFormChange("totalAmount", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-bold text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Warranty Document Form Fields */}
          {documentType === "warranty" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Laptop className="h-3.5 w-3.5" /> Ürün / Cihaz Adı
                </label>
                <input
                  type="text"
                  placeholder="Örn: MacBook Pro M3 veya Buzdolabı"
                  value={formData.productName || ""}
                  onChange={(e) => handleFormChange("productName", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Building2 className="h-3.5 w-3.5" /> Marka / Satıcı
                </label>
                <input
                  type="text"
                  value={formData.brand || formData.vendorName || ""}
                  onChange={(e) => {
                    handleFormChange("brand", e.target.value);
                    handleFormChange("vendorName", e.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Tag className="h-3.5 w-3.5" /> Model No
                </label>
                <input
                  type="text"
                  placeholder="Örn: A2992 veya SKU-123"
                  value={formData.model || ""}
                  onChange={(e) => handleFormChange("model", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Hash className="h-3.5 w-3.5" /> Seri Numarası / IMEI
                </label>
                <input
                  type="text"
                  placeholder="Örn: C02XL198J123"
                  value={formData.serialNumber || ""}
                  onChange={(e) => handleFormChange("serialNumber", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Calendar className="h-3.5 w-3.5" /> Satın Alma Tarihi
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate || formData.invoiceDate || ""}
                  onChange={(e) => handleFormChange("purchaseDate", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Clock className="h-3.5 w-3.5" /> Garanti Süresi (Ay)
                </label>
                <input
                  type="number"
                  value={formData.warrantyMonths || 24}
                  onChange={(e) => handleFormChange("warrantyMonths", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <Calendar className="h-3.5 w-3.5" /> Garanti Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={formData.warrantyEndDate || ""}
                  onChange={(e) => handleFormChange("warrantyEndDate", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-semibold text-emerald-500 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-text-muted">
                  <CreditCard className="h-3.5 w-3.5" /> Satın Alma Tutarı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice || formData.totalAmount || ""}
                  onChange={(e) => handleFormChange("purchasePrice", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-bold text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Transfer & Action Footer Bar */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-text-muted flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Verileri kontrol ettikten sonra 2. aşama ekleme sayfasına aktarabilirsiniz.</span>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs border border-border bg-bg-card text-text-primary rounded-lg hover:bg-bg-secondary font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Bu Sayfada Hızlı Kaydet"}
              </button>

              <button
                type="button"
                onClick={handleTransferToModule}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm"
              >
                <span>
                  {documentType === "invoice"
                    ? "Gider Sayfasına Aktar (Kategori & Harcama Yeri Seç)"
                    : "Garanti Sayfasına Aktar (Son Kontrolleri Yap)"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
