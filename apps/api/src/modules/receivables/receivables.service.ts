import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class ReceivablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [receivables, incomeInstallments, categories, accounts] =
      await Promise.all([
        this.prisma.receivable.findMany({
          where,
          orderBy: { createdAt: sortOrder },
          include: { payments: { orderBy: { paymentDate: "desc" } } },
        }),
        this.prisma.incomeTransaction.findMany({
          where: { tenantId, deletedAt: null, parentId: { not: null } },
          orderBy: { transactionDate: "asc" },
        }),
        this.prisma.category.findMany({ where: { tenantId, deletedAt: null } }),
        this.prisma.account.findMany({ where: { tenantId, deletedAt: null } }),
      ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    const now = new Date();
    const groupedPlans = new Map<string, any[]>();
    for (const inc of incomeInstallments) {
      if (!inc.parentId) continue;
      if (!groupedPlans.has(inc.parentId)) {
        groupedPlans.set(inc.parentId, []);
      }
      groupedPlans.get(inc.parentId)!.push(inc);
    }

    const incomePlans: any[] = [];
    for (const [planId, items] of groupedPlans.entries()) {
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      const paidItems = items.filter(
        (item) => new Date(item.transactionDate) <= now,
      );
      const paidAmount = paidItems.reduce((sum, item) => sum + item.amount, 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);

      const category = firstItem.categoryId
        ? categoryMap.get(firstItem.categoryId)
        : null;
      const accountName = firstItem.accountId
        ? accountMap.get(firstItem.accountId)
        : null;

      const rawDesc = firstItem.description || "";
      const cleanDesc =
        rawDesc.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim() ||
        (category ? category.name : "Taksitli Alacak");

      const planInstallments = items.map((item, idx) => {
        const isPaid = new Date(item.transactionDate) <= now;
        return {
          id: item.id,
          receivableId: `plan_${planId}`,
          number: idx + 1,
          amount: item.amount,
          dueDate: item.transactionDate,
          paidDate: isPaid ? item.transactionDate : null,
          paidAmount: isPaid ? item.amount : 0,
          status: isPaid ? ("PAID" as const) : ("PLANNED" as const),
          description: item.description,
          source: item.source || null,
          categoryId: item.categoryId,
          categoryName: category?.name || null,
        };
      });

      incomePlans.push({
        id: `plan_${planId}`,
        planId: planId,
        sourceType: "INCOME_TRANSACTION",
        debtorName:
          firstItem.source || (accountName ? accountName : "Taksitli Alacak"),
        description: cleanDesc,
        amount: totalAmount,
        totalAmount,
        paidAmount,
        remainingAmount,
        currency: firstItem.currency || "TRY",
        givenDate: firstItem.transactionDate,
        expectedPaymentDate: lastItem.transactionDate,
        installmentCount: items.length,
        installmentAmount: items[0]?.amount || totalAmount / items.length,
        status: remainingAmount <= 0 ? "PAID" : "OPEN",
        category: category
          ? {
              id: category.id,
              name: category.name,
              icon: category.icon,
              color: category.color,
            }
          : null,
        accountName,
        installments: planInstallments,
        payments: [],
        createdAt: firstItem.createdAt,
      });
    }

    const mappedReceivables = receivables.map((rec) => ({
      ...rec,
      totalAmount: rec.amount,
      sourceType: "RECEIVABLE",
      installments: [],
    }));

    const allData = [...incomePlans, ...mappedReceivables];
    allData.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      data: allData,
      total: allData.length,
      page: 1,
      pageSize: allData.length,
    };
  }

  async findOne(id: string, tenantId: string) {
    if (id.startsWith("plan_")) {
      const all = await this.findAll(tenantId, {});
      const item = all.data.find((d: any) => d.id === id);
      if (!item) throw new NotFoundException("Taksit planı bulunamadı.");
      return item;
    }
    const rec = await this.prisma.receivable.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { payments: { orderBy: { paymentDate: "desc" } } },
    });
    if (!rec) throw new NotFoundException("Alacak kaydı bulunamadı.");
    return rec;
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.receivable.create({
      data: {
        tenantId,
        debtorName: dto.debtorName,
        amount: dto.amount,
        currency: dto.currency || "TRY",
        givenDate: new Date(dto.givenDate),
        expectedPaymentDate: dto.expectedPaymentDate
          ? new Date(dto.expectedPaymentDate)
          : null,
        remainingAmount: dto.amount,
        description: dto.description,
        createdBy: userId,
      },
      include: { payments: true },
    });
  }

  async addPayment(
    id: string,
    tenantId: string,
    userId: string,
    dto: { amount: number; paymentDate: string; notes?: string },
  ) {
    const rec = await this.findOne(id, tenantId);
    const paymentAmount = Number(dto.amount);
    const remaining = Number(rec.remainingAmount);

    if (paymentAmount > remaining) {
      throw new BadRequestException(
        "Ödeme tutarı kalan alacak tutarını geçemez.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.receivablePayment.create({
        data: {
          receivableId: id,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          notes: dto.notes,
          createdBy: userId,
        },
      });
      const newPaid = Number(rec.paidAmount) + paymentAmount;
      const newRemaining = remaining - paymentAmount;
      const status = newRemaining <= 0
        ? "PAID"
        : "PARTIALLY_PAID";

      return tx.receivable.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining <= 0 ? 0 : newRemaining,
          status,
        },
        include: { payments: { orderBy: { paymentDate: "desc" } } },
      });
    });
  }

  async remove(id: string, tenantId: string) {
    if (id.startsWith("plan_")) {
      const planId = id.replace("plan_", "");
      return this.prisma.incomeTransaction.updateMany({
        where: { tenantId, parentId: planId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }
    await this.findOne(id, tenantId);
    return this.prisma.receivable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
