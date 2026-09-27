import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { extname } from "path";
import { GoogleDriveService } from "../integrations/google-drive.service";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private driveService: GoogleDriveService
  ) {}

  private getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)?.trim();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "documents";
    return url && key ? { url, key, bucket } : null;
  }

  private formatDocument(doc: any) {
    const supabase = this.getSupabaseConfig();
    let fileUrl: string | null = null;

    if (doc.provider === "SUPABASE" && supabase) {
      fileUrl = `${supabase.url}/storage/v1/object/public/${supabase.bucket}/${doc.storageKey}`;
    } else if (doc.provider === "LOCAL") {
      fileUrl = `/api/v1/documents/${doc.id}/file`;
    }

    return {
      ...doc,
      fileUrl,
    };
  }

  async findAll(tenantId: string) {
    const docs = await this.prisma.document.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return docs.map((d) => this.formatDocument(d));
  }

  async findOne(id: string, tenantId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException("Belge bulunamadı.");
    return this.formatDocument(doc);
  }

  async create(tenantId: string, userId: string, file: Express.Multer.File, body: any) {
    const { entityType, entityId } = body;
    let storageKey = "";
    let provider = "LOCAL";
    let driveLink: string | null = null;

    const supabase = this.getSupabaseConfig();
    const driveStatus = await this.driveService.getIntegrationStatus(tenantId);

    if (supabase) {
      // 1. Supabase Storage Entegrasyonu
      try {
        const filePath = `${tenantId}/${uuidv4()}${extname(file.originalname)}`;
        const uploadUrl = `${supabase.url}/storage/v1/object/${supabase.bucket}/${filePath}`;

        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabase.key}`,
            apikey: supabase.key,
            "Content-Type": file.mimetype || "application/octet-stream",
          },
          body: file.buffer as any,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          this.logger.error(`Supabase Storage upload error: ${errText}`);
          throw new Error(`Supabase Storage hatası: ${errText}`);
        }

        storageKey = filePath;
        provider = "SUPABASE";
        driveLink = `${supabase.url}/storage/v1/object/public/${supabase.bucket}/${filePath}`;
        this.logger.log(`File uploaded to Supabase Storage: ${filePath}`);
      } catch (err: any) {
        this.logger.error("Supabase upload failed, falling back to local storage", err);
      }
    }

    if (!storageKey && driveStatus.connected) {
      // 2. Google Drive Entegrasyonu
      try {
        const driveResult = await this.driveService.uploadFile(tenantId, file);
        storageKey = driveResult.id || "";
        provider = "GOOGLE_DRIVE";
        driveLink = driveResult.webViewLink || null;
      } catch (error: any) {
        this.logger.error("Failed to upload to Google Drive", error);
        throw new Error("Google Drive yükleme hatası: " + error.message);
      }
    }

    if (!storageKey) {
      // 3. Yerel Disk (Local Fallback)
      const uploadDir = "./uploads";
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (e) {}

      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      await fs.writeFile(path.join(uploadDir, uniqueName), file.buffer);
      storageKey = uniqueName;
      provider = "LOCAL";
    }

    const document = await this.prisma.document.create({
      data: {
        tenantId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey,
        provider,
        entityType,
        entityId,
        uploadedBy: userId,
      },
    });

    return this.formatDocument({ ...document, webViewLink: driveLink });
  }

  async getFileStream(id: string, tenantId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException("Belge bulunamadı.");

    const supabase = this.getSupabaseConfig();
    if (doc.provider === "SUPABASE" && supabase) {
      const publicUrl = `${supabase.url}/storage/v1/object/public/${supabase.bucket}/${doc.storageKey}`;
      return { type: "REDIRECT", url: publicUrl, fileName: doc.fileName };
    }

    if (doc.provider === "LOCAL") {
      const localPath = path.resolve("./uploads", doc.storageKey);
      if (!existsSync(localPath)) {
        throw new NotFoundException("Dosya sunucuda bulunamadı.");
      }
      return {
        type: "STREAM",
        stream: createReadStream(localPath),
        fileName: doc.fileName,
        mimeType: doc.fileType,
      };
    }

    throw new NotFoundException("Harici dosya için indirme bağlantısı mevcut değil.");
  }

  async remove(id: string, tenantId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException("Belge bulunamadı.");

    const supabase = this.getSupabaseConfig();
    if (doc.provider === "SUPABASE" && supabase) {
      try {
        const deleteUrl = `${supabase.url}/storage/v1/object/${supabase.bucket}/${doc.storageKey}`;
        await fetch(deleteUrl, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${supabase.key}`,
            apikey: supabase.key,
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to delete file from Supabase Storage: ${doc.storageKey}`);
      }
    } else if (doc.provider === "LOCAL") {
      try {
        const localPath = path.resolve("./uploads", doc.storageKey);
        await fs.unlink(localPath);
      } catch (e) {}
    }

    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
