import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class WarrantiesService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // CORE WARRANTY CRUD
  // ========================

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };

    // Filtreleme
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.warrantyType) where.warrantyType = query.warrantyType;
    if (query.search) {
      where.OR = [
        { productName: { contains: query.search, mode: "insensitive" } },
        { brand: { contains: query.search, mode: "insensitive" } },
        { model: { contains: query.search, mode: "insensitive" } },
        { serialNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.tags) {
      where.tags = { hasSome: query.tags.split(",") };
    }

    const [data, total] = await Promise.all([
      this.prisma.warranty.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { warrantyEndDate: "asc" },
        include: {
          extensions: { orderBy: { endDate: "desc" }, take: 1 },
          claims: { where: { status: { notIn: ["RESOLVED", "REJECTED"] } } },
          invoice: { select: { id: true, provider: true, invoiceNumber: true } },
        },
      }),
      this.prisma.warranty.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async findOne(id: string, tenantId: string) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        extensions: { orderBy: { endDate: "desc" } },
        claims: { orderBy: { claimDate: "desc" } },
        services: { orderBy: { serviceDate: "desc" } },
        invoice: true,
      },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");
    return warranty;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const status = this.calculateStatus(new Date(dto.warrantyEndDate));
    return this.prisma.warranty.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        status,
        purchaseDate: new Date(dto.purchaseDate),
        warrantyStartDate: new Date(dto.warrantyStartDate),
        warrantyEndDate: new Date(dto.warrantyEndDate),
        purchasePrice: dto.purchasePrice ? Number(dto.purchasePrice) : null,
        amount: dto.amount ? Number(dto.amount) : null,
        tags: dto.tags || [],
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    const w = await this.prisma.warranty.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!w) throw new NotFoundException("Garanti kaydı bulunamadı.");

    const updateData: any = { ...dto };
    if (dto.purchaseDate) updateData.purchaseDate = new Date(dto.purchaseDate);
    if (dto.warrantyStartDate) updateData.warrantyStartDate = new Date(dto.warrantyStartDate);
    if (dto.warrantyEndDate) {
      updateData.warrantyEndDate = new Date(dto.warrantyEndDate);
      updateData.status = this.calculateStatus(new Date(dto.warrantyEndDate));
    }
    if (dto.purchasePrice !== undefined) updateData.purchasePrice = dto.purchasePrice ? Number(dto.purchasePrice) : null;
    if (dto.amount !== undefined) updateData.amount = dto.amount ? Number(dto.amount) : null;

    return this.prisma.warranty.update({ where: { id }, data: updateData });
  }

  async remove(id: string, tenantId: string) {
    const w = await this.prisma.warranty.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!w) throw new NotFoundException("Garanti kaydı bulunamadı.");
    return this.prisma.warranty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ========================
  // STATISTICS & DASHBOARD
  // ========================

  async getStats(tenantId: string) {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const baseWhere = { tenantId, deletedAt: null };

    const [total, active, expiring, expired, openClaims, warranties] =
      await Promise.all([
        this.prisma.warranty.count({ where: baseWhere }),
        this.prisma.warranty.count({
          where: { ...baseWhere, status: "ACTIVE" },
        }),
        this.prisma.warranty.count({
          where: {
            ...baseWhere,
            warrantyEndDate: { gte: today, lte: in30Days },
            status: { not: "EXPIRED" },
          },
        }),
        this.prisma.warranty.count({
          where: { ...baseWhere, status: "EXPIRED" },
        }),
        this.prisma.warrantyClaim.count({
          where: {
            warranty: { tenantId },
            status: { notIn: ["RESOLVED", "REJECTED"] },
          },
        }),
        this.prisma.warranty.findMany({
          where: { ...baseWhere, amount: { not: null } },
          select: { amount: true },
        }),
      ]);

    const totalValue = warranties.reduce((sum, w) => sum + (w.amount || 0), 0);

    return { total, active, expiring, expired, openClaims, totalValue };
  }

  async getExpiring(tenantId: string) {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    return this.prisma.warranty.findMany({
      where: {
        tenantId,
        deletedAt: null,
        warrantyEndDate: { gte: today, lte: in30Days },
        status: { not: "EXPIRED" },
      },
      orderBy: { warrantyEndDate: "asc" },
    });
  }

  // ========================
  // WARRANTY EXTENSIONS
  // ========================

  async extendWarranty(
    warrantyId: string,
    tenantId: string,
    userId: string,
    dto: any,
  ) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    const extension = await this.prisma.warrantyExtension.create({
      data: {
        warrantyId,
        provider: dto.provider,
        extensionType: dto.extensionType || "EXTENDED",
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        cost: dto.cost ? Number(dto.cost) : null,
        currency: dto.currency || "TRY",
        policyNumber: dto.policyNumber || null,
        coverageDetails: dto.coverageDetails || null,
        attachmentId: dto.attachmentId || null,
        notes: dto.notes || null,
        createdBy: userId,
      },
    });

    // Yeni bitiş tarihi mevcut garanti bitiş tarihinden sonraysa güncelle
    const newEndDate = new Date(dto.endDate);
    if (newEndDate > warranty.warrantyEndDate) {
      await this.prisma.warranty.update({
        where: { id: warrantyId },
        data: {
          warrantyEndDate: newEndDate,
          status: "EXTENDED",
        },
      });
    }

    return extension;
  }

  async getExtensions(warrantyId: string, tenantId: string) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    return this.prisma.warrantyExtension.findMany({
      where: { warrantyId },
      orderBy: { startDate: "asc" },
    });
  }

  // ========================
  // WARRANTY CLAIMS
  // ========================

  async createClaim(
    warrantyId: string,
    tenantId: string,
    userId: string,
    dto: any,
  ) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    const claim = await this.prisma.warrantyClaim.create({
      data: {
        warrantyId,
        issueDescription: dto.issueDescription,
        claimDate: dto.claimDate ? new Date(dto.claimDate) : new Date(),
        rmaNumber: dto.rmaNumber || null,
        attachmentId: dto.attachmentId || null,
        notes: dto.notes || null,
        createdBy: userId,
      },
    });

    // Garanti durumunu CLAIMED olarak güncelle
    await this.prisma.warranty.update({
      where: { id: warrantyId },
      data: { status: "CLAIMED" },
    });

    return claim;
  }

  async updateClaimStatus(
    warrantyId: string,
    claimId: string,
    tenantId: string,
    dto: any,
  ) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    const claim = await this.prisma.warrantyClaim.findFirst({
      where: { id: claimId, warrantyId },
    });
    if (!claim) throw new NotFoundException("Talep bulunamadı.");

    const updateData: any = { status: dto.status };
    if (dto.resolution) updateData.resolution = dto.resolution;
    if (dto.repairCost !== undefined)
      updateData.repairCost = Number(dto.repairCost);
    if (dto.status === "RESOLVED") updateData.resolvedDate = new Date();
    if (dto.notes) updateData.notes = dto.notes;

    const updated = await this.prisma.warrantyClaim.update({
      where: { id: claimId },
      data: updateData,
    });

    // Talep çözüldüyse garanti durumunu geri güncelle
    if (dto.status === "RESOLVED" || dto.status === "REJECTED") {
      const status = this.calculateStatus(warranty.warrantyEndDate);
      await this.prisma.warranty.update({
        where: { id: warrantyId },
        data: { status },
      });
    }

    return updated;
  }

  async getClaims(warrantyId: string, tenantId: string) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    return this.prisma.warrantyClaim.findMany({
      where: { warrantyId },
      orderBy: { claimDate: "desc" },
    });
  }

  async getAllClaims(tenantId: string, query: any) {
    const { skip, pageSize } = parsePagination(query);
    const where: any = { warranty: { tenantId, deletedAt: null } };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.warrantyClaim.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { claimDate: "desc" },
        include: {
          warranty: {
            select: {
              id: true,
              productName: true,
              brand: true,
              model: true,
            },
          },
        },
      }),
      this.prisma.warrantyClaim.count({ where }),
    ]);
    return { data, total, page: query.page ? parseInt(query.page) : 1, pageSize };
  }

  // ========================
  // SERVICE RECORDS
  // ========================

  async addServiceRecord(
    warrantyId: string,
    tenantId: string,
    userId: string,
    dto: any,
  ) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    return this.prisma.serviceRecord.create({
      data: {
        warrantyId,
        serviceDate: new Date(dto.serviceDate),
        serviceProvider: dto.serviceProvider,
        description: dto.description,
        partsReplaced: dto.partsReplaced || null,
        cost: dto.cost ? Number(dto.cost) : null,
        currency: dto.currency || "TRY",
        nextServiceDate: dto.nextServiceDate
          ? new Date(dto.nextServiceDate)
          : null,
        attachmentId: dto.attachmentId || null,
        notes: dto.notes || null,
        createdBy: userId,
      },
    });
  }

  async getServiceHistory(warrantyId: string, tenantId: string) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: warrantyId, tenantId, deletedAt: null },
    });
    if (!warranty) throw new NotFoundException("Garanti kaydı bulunamadı.");

    return this.prisma.serviceRecord.findMany({
      where: { warrantyId },
      orderBy: { serviceDate: "desc" },
    });
  }

  async getAllServices(tenantId: string, query: any) {
    const { skip, pageSize } = parsePagination(query);
    const where: any = { warranty: { tenantId, deletedAt: null } };

    const [data, total] = await Promise.all([
      this.prisma.serviceRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { serviceDate: "desc" },
        include: {
          warranty: {
            select: {
              id: true,
              productName: true,
              brand: true,
              model: true,
            },
          },
        },
      }),
      this.prisma.serviceRecord.count({ where }),
    ]);
    return { data, total, page: query.page ? parseInt(query.page) : 1, pageSize };
  }

  // ========================
  // TIMELINE
  // ========================

  async getTimeline(id: string, tenantId: string) {
    const warranty = await this.findOne(id, tenantId);
    const events: any[] = [];

    // Satın alma
    events.push({
      type: "purchase",
      date: warranty.purchaseDate,
      title: "Satın Alma",
      description: `${warranty.purchasePlace || "Bilinmiyor"} - ${warranty.purchasePrice ? warranty.purchasePrice.toLocaleString("tr-TR") + " " + warranty.currency : ""}`,
    });

    // Garanti başlangıcı
    events.push({
      type: "warranty_start",
      date: warranty.warrantyStartDate,
      title: "Garanti Başlangıcı",
      description: `${warranty.warrantyType} garanti`,
    });

    // Uzatmalar
    for (const ext of warranty.extensions) {
      events.push({
        type: "extension",
        date: ext.startDate,
        title: "Garanti Uzatma",
        description: `${ext.provider} — ${ext.endDate.toLocaleDateString("tr-TR")} tarihine kadar`,
      });
    }

    // Servisler
    for (const svc of warranty.services) {
      events.push({
        type: "service",
        date: svc.serviceDate,
        title: "Servis",
        description: `${svc.serviceProvider} — ${svc.description}`,
      });
    }

    // Talepler
    for (const claim of warranty.claims) {
      events.push({
        type: "claim",
        date: claim.claimDate,
        title: `Garanti Talebi (${claim.status})`,
        description: claim.issueDescription,
      });
    }

    // Garanti bitiş
    events.push({
      type: "warranty_end",
      date: warranty.warrantyEndDate,
      title: "Garanti Bitiş",
      description: "",
    });

    // Tarihe göre sırala
    events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return events;
  }

  // ========================
  // HELPERS
  // ========================

  private calculateStatus(
    endDate: Date,
  ): "ACTIVE" | "EXPIRING" | "EXPIRED" {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    if (endDate < today) return "EXPIRED";
    if (endDate <= in30Days) return "EXPIRING";
    return "ACTIVE";
  }
}
