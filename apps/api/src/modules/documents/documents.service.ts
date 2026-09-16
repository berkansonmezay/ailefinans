import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as fs from "fs/promises";
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

  async findAll(tenantId: string) {
    return this.prisma.document.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException("Belge bulunamadı.");
    return doc;
  }

  async create(tenantId: string, userId: string, file: Express.Multer.File, body: any) {
    const { entityType, entityId } = body;
    let storageKey = "";
    let provider = "LOCAL";
    let driveLink: string | null = null;

    const driveStatus = await this.driveService.getIntegrationStatus(tenantId);
    
    if (driveStatus.connected) {
      try {
        const driveResult = await this.driveService.uploadFile(tenantId, file);
        storageKey = driveResult.id || "";
        provider = "GOOGLE_DRIVE";
        driveLink = driveResult.webViewLink || null;
      } catch (error: any) {
        this.logger.error("Failed to upload to Google Drive", error);
        throw new Error("Google Drive yükleme hatası: " + error.message);
      }
    } else {
      // Local fallback
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

    return { ...document, webViewLink: driveLink };
  }

  async remove(id: string, tenantId: string) {
    const doc = await this.findOne(id, tenantId);
    
    // Delete physical file (Optional, if we want soft delete maybe don't delete immediately)
    // For MVP, we will just soft delete the db record.
    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
