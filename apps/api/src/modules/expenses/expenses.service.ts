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
    const tDate = dto.transactionDate || dto.date || new Date();
    const parsedDate = new Date(tDate);

    return this.prisma.expenseTransaction.create({
      data: {
        tenantId,
        createdBy: userId,
        amount: parseFloat(dto.amount) || 0,
        currency: dto.currency || "TRY",
        description: dto.description || dto.title || "Gider Harcaması",
        notes: dto.notes || null,
        categoryId: dto.categoryId || null,
        subcategoryId: dto.subcategoryId || null,
        merchantId: dto.merchantId || null,
        accountId: dto.accountId || null,
        paymentMethod: dto.paymentMethod || null,
        installmentPlanId: dto.installmentPlanId || null,
        attachmentId: dto.attachmentId || null,
        isRecurring: !!dto.isRecurring,
        recurrenceRule: dto.recurrenceRule || null,
        transactionDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    await this.findOne(id, tenantId);
    const updateData: any = {};
    if (dto.amount !== undefined) updateData.amount = parseFloat(dto.amount) || 0;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.description !== undefined || dto.title !== undefined)
      updateData.description = dto.description || dto.title;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.merchantId !== undefined) updateData.merchantId = dto.merchantId;
    if (dto.accountId !== undefined) updateData.accountId = dto.accountId;
    if (dto.paymentMethod !== undefined) updateData.paymentMethod = dto.paymentMethod;
    if (dto.transactionDate || dto.date) {
      const pDate = new Date(dto.transactionDate || dto.date);
      if (!isNaN(pDate.getTime())) updateData.transactionDate = pDate;
    }
    return this.prisma.expenseTransaction.update({ where: { id }, data: updateData });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.expenseTransaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
