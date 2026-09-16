"use client";

import { useState } from "react";
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
  Clock,
  Laptop,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

export default function FaturaUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<"invoice" | "warranty">("invoice");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
        setFormData(json.data);
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
      // Recalculate warranty end date if purchaseDate or warrantyMonths change
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
    setIsSaving(true);

    try {
      const token = localStorage.getItem("access_token") || "";

      if (documentType === "invoice") {
        // Save as Expense
        const expensePayload = {
          description: `${formData.vendorName || "Fatura"} Harcaması`,
          amount: parseFloat(formData.totalAmount) || 0,
          transactionDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: formData.invoiceNumber ? `Fatura No: ${formData.invoiceNumber}` : "",
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
        // Save as Warranty
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Akıllı Belge Tarama</h1>
          <p className="text-muted-foreground mt-1">
            Fatura, fiş veya garanti belgesi yükleyin; sistem belgenin türüne göre bilgileri otomatik çıkarsın ve ilgili ekleme ekranına aktarsın.
          </p>
        </div>
      </div>

      {/* 2 Aşamalı İşlem Adımları */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
            !formData
              ? "bg-primary/10 border-primary text-primary shadow-sm"
              : "bg-muted/40 border-border text-muted-foreground"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              !formData ? "bg-primary text-primary-foreground" : "bg-green-600 text-white"
            }`}
          >
            {!formData ? "1" : "✓"}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">1. Aşama</p>
            <p className="text-sm font-medium">Belge Yükleme & Ayrıştırma</p>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
            formData
              ? "bg-primary/10 border-primary text-primary shadow-sm"
              : "bg-muted/20 border-border text-muted-foreground opacity-60"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              formData ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">2. Aşama</p>
            <p className="text-sm font-medium">
              {documentType === "invoice"
                ? "Gider Ekleme Sayfasına Aktar"
                : "Garanti Kayıt Sayfasına Aktar"}
            </p>
          </div>
        </div>
      </div>

      {/* Belge Türü Seçimi */}
      <div className="flex justify-center space-x-4 mb-4">
        <button
          onClick={() => {
            setDocumentType("invoice");
            setFormData(null);
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm ${
            documentType === "invoice"
              ? "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-primary/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Fatura / Fiş</span>
        </button>
        <button
          onClick={() => {
            setDocumentType("warranty");
            setFormData(null);
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm ${
            documentType === "warranty"
              ? "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-primary/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Garanti Belgesi</span>
        </button>
      </div>

      {/* Dosya Yükleme Kutusu */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 border-b border-border border-dashed flex flex-col items-center justify-center bg-muted/15">
          <div className="p-4 rounded-full bg-primary/10 mb-4 text-primary">
            <UploadCloud className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold">
            {documentType === "invoice"
              ? "Fatura veya Fiş Dosyası Yükleyin"
              : "Garanti Belgesi Dosyası Yükleyin"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            PDF, PNG, JPG, JPEG veya Excel (.xlsx, .csv) desteklenir
          </p>
          <label className="cursor-pointer bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
            Dosya Seç
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
              onChange={handleFileChange}
            />
          </label>
          {file && (
            <div className="mt-6 flex items-center space-x-3 bg-background px-4 py-2.5 rounded-lg border border-border shadow-sm">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{file.name}</span>
            </div>
          )}
        </div>
        <div className="p-4 bg-muted/30 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isProcessing ? "Belge Analiz Ediliyor..." : "Verileri Otomatik Çıkar"}
          </button>
        </div>
      </div>

      {/* Çıkarılan Veriler Formu */}
      {formData && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold">
                {documentType === "invoice" ? "1. Aşama: Çıkarılan Fatura Verileri" : "1. Aşama: Çıkarılan Garanti Verileri"}
              </h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {documentType === "invoice" ? "Fatura / Fiş Modu" : "Garanti Modu"}
            </span>
          </div>

          {/* Fatura / Fiş Alanları */}
          {documentType === "invoice" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Satıcı / Kurum Adı
                </label>
                <input
                  type="text"
                  value={formData.vendorName || ""}
                  onChange={(e) => handleFormChange("vendorName", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="h-4 w-4" /> Fatura / Fiş Numarası
                </label>
                <input
                  type="text"
                  placeholder="Örn: GBL2026000004589"
                  value={formData.invoiceNumber || ""}
                  onChange={(e) => handleFormChange("invoiceNumber", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Fatura Tarihi
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate || ""}
                  onChange={(e) => handleFormChange("invoiceDate", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="h-4 w-4" /> Toplam Ödenecek Tutar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalAmount ?? ""}
                  onChange={(e) => handleFormChange("totalAmount", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Garanti Belgesi Alanları */}
          {documentType === "warranty" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Laptop className="h-4 w-4" /> Ürün / Cihaz Adı
                </label>
                <input
                  type="text"
                  placeholder="Örn: MacBook Pro M3 veya Buzdolabı"
                  value={formData.productName || ""}
                  onChange={(e) => handleFormChange("productName", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Marka / Satıcı
                </label>
                <input
                  type="text"
                  value={formData.brand || formData.vendorName || ""}
                  onChange={(e) => {
                    handleFormChange("brand", e.target.value);
                    handleFormChange("vendorName", e.target.value);
                  }}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Tag className="h-4 w-4" /> Model / Model No
                </label>
                <input
                  type="text"
                  placeholder="Örn: A2992 veya SKU-123"
                  value={formData.model || ""}
                  onChange={(e) => handleFormChange("model", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="h-4 w-4" /> Seri No / IMEI
                </label>
                <input
                  type="text"
                  placeholder="Örn: C02XG123... veya UUID"
                  value={formData.serialNumber || ""}
                  onChange={(e) => handleFormChange("serialNumber", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Satın Alma / Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate || formData.invoiceDate || ""}
                  onChange={(e) => handleFormChange("purchaseDate", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" /> Garanti Süresi (Ay)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.warrantyMonths ?? 24}
                  onChange={(e) => handleFormChange("warrantyMonths", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Garanti Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={formData.warrantyEndDate || ""}
                  onChange={(e) => handleFormChange("warrantyEndDate", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="h-4 w-4" /> Satın Alma Tutarı (₺) (Opsiyonel)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice ?? formData.totalAmount ?? ""}
                  onChange={(e) => handleFormChange("purchasePrice", e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start space-x-3 text-foreground">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">
                {documentType === "invoice" ? "2. Aşama: Gider Ekleme & Kategori Seçimi" : "2. Aşama: Garanti Kaydı & Son Kontroller"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {documentType === "invoice"
                  ? "Taranan tutar ve tarih bilgileriyle Gider Ekleme sayfasına aktarabilir; harcama yeri ve kategori seçerek kaydı tamamlayabilirsiniz."
                  : "Taranan ürün, marka, model ve seri no bilgileriyle Garanti sayfasına aktarabilir; son kontrollerinizi yaparak kaydı tamamlayabilirsiniz."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setFormData(null)}
              className="w-full sm:w-auto px-4 py-2.5 text-sm border border-border rounded-lg hover:bg-muted font-medium transition-colors"
            >
              İptal
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleApprove}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-2.5 text-sm border border-border bg-background rounded-lg hover:bg-muted font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Bu Sayfada Hızlı Kaydet"}
              </button>

              <button
                onClick={handleTransferToModule}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 text-sm bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
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
