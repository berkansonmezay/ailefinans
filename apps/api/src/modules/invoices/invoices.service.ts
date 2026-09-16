import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as Tesseract from "tesseract.js";
import { PDFParse } from "pdf-parse";
import * as xlsx from "xlsx";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async create(tenantId: string, userId: string, dto: any) {
    const invDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
    const dDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        createdBy: userId,
        provider: dto.provider || dto.vendorName || "Bilinmiyor",
        invoiceNumber: dto.invoiceNumber || null,
        amount: parseFloat(dto.amount || dto.totalAmount) || 0,
        currency: dto.currency || "TRY",
        status: dto.status || "PAID",
        notes: dto.notes || null,
        categoryId: dto.categoryId || null,
        accountId: dto.accountId || null,
        attachmentId: dto.attachmentId || null,
        invoiceDate: isNaN(invDate.getTime()) ? new Date() : invDate,
        dueDate: dDate && !isNaN(dDate.getTime()) ? dDate : null,
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!inv) throw new NotFoundException("Fatura bulunamadı.");
    return this.prisma.invoice.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!inv) throw new NotFoundException("Fatura bulunamadı.");
    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private parseTurkishNumber(str: string): number {
    if (!str) return 0;
    // Remove currency symbols, asterisks, spaces, letters
    let clean = str.replace(/[^\d.,]/g, '').trim();
    if (!clean) return 0;

    // Both comma and dot present (e.g. 1.250,50 or 1,250.50)
    if (clean.includes(',') && clean.includes('.')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        // Turkish style: 1.250,50
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // Standard US style: 1,250.50
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes(',')) {
      // Only comma: 421,90
      clean = clean.replace(',', '.');
    }

    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  private isSystemHeader(upper: string): boolean {
    return (
      upper.includes("E-ARŞİV") ||
      upper.includes("E-ARSIV") ||
      upper.includes("E-FATURA") ||
      upper.includes("E-SMM") ||
      upper.includes("TİCARİ FATURA") ||
      upper.includes("TICARI FATURA") ||
      upper.includes("TEMEL FATURA") ||
      upper.includes("SATIŞ FATURASI") ||
      upper.includes("FATURA DETAYLARI") ||
      upper.includes("BİLGİ FİŞİ") ||
      upper.includes("BILGI FISI") ||
      upper.includes("MALİ DEĞERİ YOKTUR") ||
      upper.includes("MALI DEGERI YOKTUR") ||
      upper.includes("YENİ NESİL") ||
      upper.includes("YENI NESIL") ||
      upper.includes("ÖKC") ||
      upper.includes("OKC") ||
      upper.includes("HAZİNE VE MALİYE") ||
      upper.includes("GELİR İDARESİ") ||
      upper.includes("ÖZELLEŞTİRME NO") ||
      upper.includes("SENARYO:") ||
      upper.includes("FATURA TİPİ") ||
      upper.includes("TARİH") ||
      upper.includes("TARIH") ||
      upper.includes("SAAT") ||
      upper.includes("FİŞ NO") ||
      upper.includes("FIS NO") ||
      upper.includes("VKN") ||
      upper.includes("TCKN") ||
      upper.includes("TEL:") ||
      upper.includes("TEL.") ||
      upper.includes("FAX:") ||
      upper.includes("E-POSTA") ||
      upper.includes("E-MAIL") ||
      upper.includes("WEB:") ||
      upper.includes("MERSİS") ||
      upper.includes("MERSIS") ||
      upper.includes("VERGİ DAİRESİ") ||
      upper.includes("VERGI DAIRESI") ||
      upper.includes("KASİYER") ||
      upper.includes("KASIYER") ||
      upper.includes("KASA :") ||
      upper.includes("KASA:") ||
      upper.includes("EKÜ NO") ||
      upper.includes("Z NO") ||
      upper.includes("TEŞEKKÜR") ||
      upper.includes("TESSEKKUR") ||
      upper.startsWith("---") ||
      upper.startsWith("===") ||
      upper.startsWith("***") ||
      upper.startsWith("___")
    );
  }

  private cleanVendorName(str: string): string {
    return str
      .replace(/^(?:ÜNVAN|UNVAN|FİRMA\s*ADI|SATICI\s*ADI|SATICI|DÜZENLEYEN|İŞLETME\s*ADI)\s*[:\/-]?\s*/i, "")
      .replace(/^[*_~#-]+\s*/, "")
      .replace(/\s*[*_~#-]+$/, "")
      .trim();
  }

  private detectVendorName(lines: string[]): string {
    // 1. Explicit Satıcı / Düzenleyen label check
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upper = line.toLocaleUpperCase("tr-TR");

      const saticiMatch = line.match(/(?:SATICI|DÜZENLEYEN|HİZMETİ\s+VEREN|GÖNDEREN)\s*(?:\([^)]*\))?\s*[:\/-]?\s*(.+)/i);
      if (saticiMatch && saticiMatch[1] && saticiMatch[1].trim().length >= 3) {
        const candidate = saticiMatch[1].replace(/^(?:BİLGİLERİ|UNVAN|ÜNVAN|AD|ADI|SOYADI)[:\s-]*/i, "").trim();
        if (candidate.length >= 3 && !candidate.match(/^(BİLGİLERİ|BİLGİSİ)$/i)) {
          return this.cleanVendorName(candidate);
        }
      }

      if (upper.includes("DÜZENLEYEN") || (upper.includes("SATICI") && !upper.includes("SAYIN"))) {
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const nextLine = lines[j];
          const unvanMatch = nextLine.match(/(?:ÜNVAN|UNVAN|FİRMA\s*ADI|ADI)\s*[:\/-]?\s*(.+)/i);
          if (unvanMatch && unvanMatch[1]) {
            return this.cleanVendorName(unvanMatch[1]);
          }
        }
      }
    }

    // 2. Isolate vendor section before "SAYIN", "ALICI BİLGİLERİ", "MÜŞTERİ"
    const vendorLines: string[] = [];
    for (const line of lines) {
      const upper = line.toLocaleUpperCase("tr-TR");
      if (
        upper.startsWith("SAYIN") ||
        upper.includes("(ALICI") ||
        upper.includes("ALICI BİLGİLERİ") ||
        upper.includes("ALICI ADI") ||
        upper.includes("MÜŞTERİ BİLGİLERİ") ||
        upper.includes("MUSTERI BILGILERI")
      ) {
        break;
      }
      vendorLines.push(line);
    }

    const candidatePool = vendorLines.length > 0 ? vendorLines : lines.slice(0, 10);

    // 3. Look for commercial company titles / suffixes in the vendor candidate pool
    const companySuffixRegex = /(?:A\.Ş\.|A\.S\.|LTD\.\s*ŞTİ\.|LTD\.STI\.|LİMİTED|ANONİM|TİC\.|SAN\.|ŞİRKETİ|HİPERMARKET|SÜPERMARKET|MARKETLERİ|MARKET|MAĞAZALARI|MAĞAZACILIK|ECZANESİ|ECZANE|PETROL|İSTASYONU|RESTORAN|CAFE|KAFE|LOKANTA|FIRIN|PASTANE|OTOMOTİV|YAZILIM|BİLİŞİM|TEKNOLOJİ|LOJİSTİK|HİZMETLERİ)/i;

    for (const line of candidatePool) {
      const upper = line.toLocaleUpperCase("tr-TR");
      if (this.isSystemHeader(upper)) continue;
      if (companySuffixRegex.test(line) && line.length >= 4 && line.length <= 100) {
        return this.cleanVendorName(line);
      }
    }

    // 4. Fallback: First non-system header line in candidate pool
    for (const line of candidatePool) {
      const upper = line.toLocaleUpperCase("tr-TR");
      if (!this.isSystemHeader(upper) && line.length >= 3 && line.length <= 100) {
        return this.cleanVendorName(line);
      }
    }

    return "Otomatik Tespit";
  }

  async extractData(file: Express.Multer.File, documentType: string = "invoice") {
    let extractedText = "";
    const mimetype = (file.mimetype || "").toLowerCase();
    const originalName = (file.originalname || "").toLowerCase();

    try {
      if (mimetype.includes("image") || originalName.match(/\.(png|jpg|jpeg|webp|bmp|tiff)$/)) {
        // Run OCR with Turkish traineddata
        const { data } = await Tesseract.recognize(file.buffer, "tur", {
          logger: (m) => console.log(m),
        });
        extractedText = data.text || "";
      } else if (mimetype.includes("pdf") || originalName.endsWith(".pdf")) {
        // PDF digital text extraction
        try {
          const parser = new PDFParse({ data: file.buffer });
          const parsed = await parser.getText();
          extractedText = parsed.text || "";
          await parser.destroy?.();

          // Fallback if PDF is a scanned image without text layer
          if (extractedText.trim().length < 20) {
            try {
              const imageParser = new PDFParse({ data: file.buffer });
              const screenshotResult = await imageParser.getScreenshot({ scale: 2, imageBuffer: true });
              if (screenshotResult?.pages?.length > 0 && screenshotResult.pages[0].data) {
                const { data } = await Tesseract.recognize(Buffer.from(screenshotResult.pages[0].data), "tur");
                extractedText = data.text || "";
              }
              await imageParser.destroy?.();
            } catch (scannedErr) {
              console.warn("Scanned PDF OCR fallback failed:", scannedErr);
            }
          }
        } catch (pdfErr) {
          console.error("PDF Parsing error:", pdfErr);
        }
      } else if (
        mimetype.includes("spreadsheet") ||
        mimetype.includes("excel") ||
        originalName.match(/\.(xlsx|xls|csv)$/)
      ) {
        // Excel/Spreadsheet extraction
        const workbook = xlsx.read(file.buffer, { type: "buffer" });
        extractedText = workbook.SheetNames.map((sheetName) =>
          xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName])
        ).join("\n");
      }
    } catch (e) {
      console.error("OCR / File Extraction Error:", e);
      extractedText = "Dosya okuma hatası.";
    }

    let foundTotal = 0;
    let foundVendor = "";
    let foundDate = new Date().toISOString().split("T")[0];

    if (extractedText) {
      const upperText = extractedText.toLocaleUpperCase("tr-TR");
      const lines = extractedText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // 1. Vendor / Institution Name Detection (Multi-Layered Strategy)
      foundVendor = this.detectVendorName(lines);

      // 2. Date Detection (e.g. TARİH : 16.09.2026 or 16/09/2026 or 2026-09-16)
      const dateMatch = extractedText.match(/(?:TAR[İI]H\s*[:.]?\s*)?(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/i);
      if (dateMatch) {
        let [_, d, m, y] = dateMatch;
        if (y.length === 2) y = "20" + y;
        // Pad day and month
        const day = d.padStart(2, "0");
        const month = m.padStart(2, "0");
        // If year was at beginning (YYYY-MM-DD format):
        if (parseInt(d) > 31 && parseInt(y) <= 31) {
          foundDate = `${d}-${m.padStart(2, "0")}-${y.padStart(2, "0")}`;
        } else {
          foundDate = `${y}-${month}-${day}`;
        }
      }

      // 3. Total Amount Detection (Strict Hierarchical Strategy)
      // Priority 1: Explicit "ÖDENECEK TUTAR" / "ÖDENECEK TOPLAM" / "TAHSİL EDİLECEK TUTAR"
      for (const line of lines) {
        const upper = line.toLocaleUpperCase("tr-TR");
        if (
          upper.includes("ÖDENECEK TUTAR") ||
          upper.includes("ODENECEK TUTAR") ||
          upper.includes("ÖDENECEK TOPLAM") ||
          upper.includes("ODENECEK TOPLAM") ||
          upper.includes("ÖDENECEK MİKTAR") ||
          upper.includes("ODENECEK MIKTAR") ||
          upper.includes("TAHSİL EDİLECEK") ||
          upper.includes("TAHSIL EDILECEK") ||
          upper.includes("NET ÖDENECEK") ||
          upper.includes("NET ODENECEK")
        ) {
          const numMatches = line.match(/(?:\*?\s*)([0-9]+[0-9.,]*)/g);
          if (numMatches && numMatches.length > 0) {
            const val = this.parseTurkishNumber(numMatches[numMatches.length - 1]);
            if (val > 0) {
              foundTotal = val;
              break;
            }
          }
        }
      }

      // Priority 2: "GENEL TOPLAM" / "VERGİLER DAHİL TOPLAM" (Must NOT be ARA TOPLAM or İSKONTO)
      if (foundTotal === 0) {
        for (const line of lines) {
          const upper = line.toLocaleUpperCase("tr-TR");
          if (
            (upper.includes("GENEL TOPLAM") ||
             upper.includes("VERGİLER DAHİL TOPLAM") ||
             upper.includes("VERGILER DAHIL TOPLAM") ||
             upper.includes("FATURA TOPLAMI") ||
             upper.includes("YEKÜN") ||
             upper.includes("YEKUN")) &&
            !upper.includes("ARA TOPLAM") &&
            !upper.includes("İSKONTO") &&
            !upper.includes("ISKONTO")
          ) {
            const numMatches = line.match(/(?:\*?\s*)([0-9]+[0-9.,]*)/g);
            if (numMatches && numMatches.length > 0) {
              const val = this.parseTurkishNumber(numMatches[numMatches.length - 1]);
              if (val > 0) {
                foundTotal = val;
                break;
              }
            }
          }
        }
      }

      // Priority 3: Standalone TOPLAM (Strictly exclude ARA TOPLAM, BRÜT TOPLAM, İSKONTO, KDV, TEVKİFAT, MAL HİZMET, Sütun başlıkları)
      if (foundTotal === 0) {
        for (const line of lines) {
          const upper = line.toLocaleUpperCase("tr-TR");
          const isExcluded =
            upper.includes("ARA TOPLAM") ||
            upper.includes("BRÜT TOPLAM") ||
            upper.includes("BRUT TOPLAM") ||
            upper.includes("İSKONTO") ||
            upper.includes("ISKONTO") ||
            upper.includes("KDV") ||
            upper.includes("TEVKİFAT") ||
            upper.includes("TEVKIFAT") ||
            upper.includes("HİZMET TUTAR") ||
            upper.includes("HIZMET TUTAR") ||
            upper.includes("ÜRÜN") ||
            upper.includes("URUN");

          if (!isExcluded && upper.includes("TOPLAM")) {
            const numMatches = line.match(/(?:\*?\s*)([0-9]+[0-9.,]*)/g);
            if (numMatches && numMatches.length > 0) {
              const val = this.parseTurkishNumber(numMatches[numMatches.length - 1]);
              if (val > 0) {
                foundTotal = val;
                break;
              }
            }
          }
        }
      }

      // Priority 4: Payment lines (e.g. KREDİ KARTI (TEMASSIZ) 421,90 or NAKİT 421,90)
      if (foundTotal === 0) {
        for (const line of lines) {
          const upper = line.toLocaleUpperCase("tr-TR");
          if (
            (upper.includes("KREDİ KARTI") ||
             upper.includes("KREDI KARTI") ||
             upper.includes("NAKİT") ||
             upper.includes("NAKIT") ||
             upper.includes("BANKA KARTI")) &&
            !upper.includes("ONAY KODU") &&
            !upper.includes("KART NO")
          ) {
            const numMatches = line.match(/([0-9]+[0-9.,]*)/g);
            if (numMatches && numMatches.length > 0) {
              const val = this.parseTurkishNumber(numMatches[numMatches.length - 1]);
              if (val > 0) {
                foundTotal = val;
                break;
              }
            }
          }
        }
      }

      // Priority 5: TOPKDV & Matrah sum fallback (e.g. TOPKDV 403,58 18,32 -> 403.58 + 18.32 = 421.90)
      if (foundTotal === 0) {
        for (const line of lines) {
          const upper = line.toLocaleUpperCase("tr-TR");
          if (upper.includes("TOPKDV") || upper.includes("TOP KDV")) {
            const nums = (line.match(/([0-9]+[0-9.,]*)/g) || []).map((n) => this.parseTurkishNumber(n)).filter((n) => n > 0);
            if (nums.length >= 2) {
              foundTotal = parseFloat((nums[0] + nums[1]).toFixed(2));
              break;
            }
          }
        }
      }

      // Priority 6: Fallback regex on raw text
      if (foundTotal === 0) {
        const match = upperText.match(/(?:ÖDENECEK\s+TUTAR|GENEL\s+TOPLAM)\s*[:*]?\s*\*?\s*([\d.,]+)/);
        if (match && match[1]) {
          foundTotal = this.parseTurkishNumber(match[1]);
        }
      }
    }

    // 4. Invoice Number Detection
    let foundInvoiceNo = "";
    if (extractedText) {
      const upperText = extractedText.toLocaleUpperCase("tr-TR");
      const invMatch = upperText.match(/(?:FATURA\s*(?:NO|NUMARASI|NUMARA|NO\.)|FİŞ\s*NO)\s*[:.]?\s*([A-Z0-9-]{3,30})/);
      if (invMatch && invMatch[1]) {
        foundInvoiceNo = invMatch[1].trim();
      }
    }

    // 5. Warranty Specific Extractions
    let foundProductName = "";
    let foundModel = "";
    let foundSerial = "";
    let foundWarrantyMonths = 24;

    if (extractedText) {
      const upperText = extractedText.toLocaleUpperCase("tr-TR");

      // Warranty duration detection
      const matchYil = upperText.match(/(\d+)\s*(?:YIL|SENE)\s*GARANT[İI]/) ||
                       upperText.match(/GARANT[İI]\s*SÜRES[İI]\s*[:.]?\s*(\d+)\s*(?:YIL|SENE)/);
      if (matchYil && matchYil[1]) {
        foundWarrantyMonths = parseInt(matchYil[1]) * 12;
      } else {
        const matchAy = upperText.match(/(\d+)\s*AY\s*GARANT[İI]/) ||
                        upperText.match(/GARANT[İI]\s*SÜRES[İI]\s*[:.]?\s*(\d+)\s*AY?/);
        if (matchAy && matchAy[1]) {
          foundWarrantyMonths = parseInt(matchAy[1]);
        }
      }

      // Product Name Detection
      const lines = extractedText.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const pMatch = line.match(/(?:ÜRÜN\s*ADI|CİHAZ|MAL\s*\/\s*HİZMET)\s*[:.]?\s*([^\n\r]+)/i);
        if (pMatch && pMatch[1] && pMatch[1].trim().length >= 3) {
          foundProductName = pMatch[1].trim();
          break;
        }
        // Match line item like "1 Bulut Sunucu Lisansı"
        const itemMatch = line.match(/^\d+\s+([A-Za-z0-9ÇĞİÖŞÜçğıöşü\s()-]{4,60})(?:\s+SKU|\s+\d+\s+Adet|\s+Adet|\s+\d+[.,]\d+|$)/i);
        if (itemMatch && itemMatch[1] && !itemMatch[1].toLocaleUpperCase("tr-TR").includes("TOPLAM")) {
          foundProductName = itemMatch[1].trim();
          break;
        }
      }

      // Model Detection
      const modelMatch = extractedText.match(/(?:SKU|MODEL\s*(?:NO)?)\s*[:.]?\s*([A-Z0-9-_]+)/i);
      if (modelMatch && modelMatch[1]) {
        foundModel = modelMatch[1].trim();
      }

      // Serial / UUID Detection
      const serialMatch = extractedText.match(/(?:SER[İI]\s*NO|IMEI)\s*[:.]?\s*([A-Z0-9-]+)/i) ||
                          extractedText.match(/ETTN\s*(?:\(UUID\))?\s*[:.]?\s*([a-f0-9-]{36})/i);
      if (serialMatch && serialMatch[1]) {
        foundSerial = serialMatch[1].trim();
      }
    }

    // Calculate warranty end date
    const startDateObj = new Date(foundDate);
    const endDateObj = new Date(startDateObj);
    if (!isNaN(startDateObj.getTime())) {
      endDateObj.setMonth(endDateObj.getMonth() + (foundWarrantyMonths || 24));
    }
    const calculatedWarrantyEndDate = isNaN(endDateObj.getTime())
      ? new Date().toISOString().split("T")[0]
      : endDateObj.toISOString().split("T")[0];

    const structuredData = {
      vendorName: foundVendor || "Otomatik Tespit",
      brand: foundVendor || "Otomatik Tespit",
      invoiceDate: foundDate,
      purchaseDate: foundDate,
      totalAmount: foundTotal || 0,
      purchasePrice: foundTotal || 0,
      invoiceNumber: foundInvoiceNo || undefined,
      productName: foundProductName || (documentType === "warranty" ? "Elektronik / Cihaz" : undefined),
      model: foundModel || undefined,
      serialNumber: foundSerial || undefined,
      warrantyMonths: documentType === "warranty" ? foundWarrantyMonths : undefined,
      warrantyStartDate: foundDate,
      warrantyEndDate: calculatedWarrantyEndDate,
      documentType,
      rawText: extractedText.substring(0, 300) + (extractedText.length > 300 ? "..." : ""),
    };

    return structuredData;
  }
}
