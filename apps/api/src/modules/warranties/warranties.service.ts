import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class WarrantiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.warranty.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { warrantyEndDate: "asc" },
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

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.warranty.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        purchaseDate: new Date(dto.purchaseDate),
        warrantyStartDate: new Date(dto.warrantyStartDate),
        warrantyEndDate: new Date(dto.warrantyEndDate),
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    const w = await this.prisma.warranty.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!w) throw new NotFoundException("Garanti kaydı bulunamadı.");
    return this.prisma.warranty.update({ where: { id }, data: dto });
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
}
