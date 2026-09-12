import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.document.create({
      data: {
        tenantId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey: file.filename,
        entityType,
        entityId,
        uploadedBy: userId,
      },
    });
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
