import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortBy, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.search)
      where.name = { contains: query.search, mode: "insensitive" };
    if (query.favorite === "true") where.isFavorite = true;

    const [data, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.merchant.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.merchant.create({
      data: { ...dto, tenantId, createdBy: userId },
    });
  }

  async createBulk(tenantId: string, userId: string, dtos: any[]) {
    const data = dtos.map(dto => ({
      ...dto,
      tenantId,
      createdBy: userId,
    }));
    return this.prisma.merchant.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    const m = await this.prisma.merchant.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!m) throw new NotFoundException("Harcama yeri bulunamadı.");
    return this.prisma.merchant.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    const m = await this.prisma.merchant.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!m) throw new NotFoundException("Harcama yeri bulunamadı.");
    return this.prisma.merchant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
