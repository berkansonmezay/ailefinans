import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
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
    return this.prisma.invoice.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
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
}
