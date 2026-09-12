import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.merchantId) where.merchantId = query.merchantId;
    if (query.startDate && query.endDate) {
      where.transactionDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }
    if (query.search)
      where.description = { contains: query.search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      this.prisma.expenseTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { transactionDate: sortOrder },
      }),
      this.prisma.expenseTransaction.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async findOne(id: string, tenantId: string) {
    const expense = await this.prisma.expenseTransaction.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!expense) throw new NotFoundException("Gider kaydı bulunamadı.");
    return expense;
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.expenseTransaction.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        transactionDate: new Date(dto.transactionDate),
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    await this.findOne(id, tenantId);
    if (dto.transactionDate)
      dto.transactionDate = new Date(dto.transactionDate);
    return this.prisma.expenseTransaction.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.expenseTransaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
