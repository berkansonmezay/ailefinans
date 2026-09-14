import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [debts, expenseInstallments, merchants, categories, accounts, reminders] =
      await Promise.all([
        this.prisma.debt.findMany({
          where,
          orderBy: { createdAt: sortOrder },
          include: { installments: { orderBy: { number: "asc" } } },
        }),
        this.prisma.expenseTransaction.findMany({
          where: { tenantId, deletedAt: null, installmentPlanId: { not: null } },
          orderBy: { transactionDate: "asc" },
        }),
        this.prisma.merchant.findMany({ where: { tenantId, deletedAt: null } }),
        this.prisma.category.findMany({ where: { tenantId, deletedAt: null } }),
        this.prisma.account.findMany({ where: { tenantId, deletedAt: null } }),
        this.prisma.reminder.findMany({ where: { tenantId, referenceType: "DEBT" }, select: { referenceId: true } }),
      ]);

    const activeReminderRefIds = new Set(reminders.map(r => r.referenceId));

    const merchantMap = new Map(merchants.map((m) => [m.id, m.name]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    const now = new Date();
    const groupedPlans = new Map<string, any[]>();
    for (const exp of expenseInstallments) {
      if (!exp.installmentPlanId) continue;
      if (!groupedPlans.has(exp.installmentPlanId)) {
        groupedPlans.set(exp.installmentPlanId, []);
      }
      groupedPlans.get(exp.installmentPlanId)!.push(exp);
    }

    const expensePlans: any[] = [];
    for (const [planId, items] of groupedPlans.entries()) {
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);



      const category = firstItem.categoryId
        ? categoryMap.get(firstItem.categoryId)
        : null;
      const merchantName = firstItem.merchantId
        ? merchantMap.get(firstItem.merchantId)
        : null;
      const accountName = firstItem.accountId
        ? accountMap.get(firstItem.accountId)
        : null;

      const rawDesc = firstItem.description || "";
      const cleanDesc =
        rawDesc.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim() ||
        (category ? category.name : "Taksitli Borç");

      const planInstallments = items.map((item, idx) => {
        const dueDate = new Date(item.transactionDate);
        const isPaid = item.notes === "PAID";
        const isOverdue = !isPaid && dueDate < now;
        const status = isPaid
          ? ("PAID" as const)
          : isOverdue
            ? ("OVERDUE" as const)
            : ("PLANNED" as const);

        return {
          id: item.id,
          debtId: `plan_${planId}`,
          number: idx + 1,
          amount: item.amount,
          dueDate: item.transactionDate,
          paidDate: isPaid ? item.updatedAt || item.transactionDate : null,
          paidAmount: isPaid ? item.amount : 0,
          status,
          isPaid,
          description: item.description,
          categoryId: item.categoryId,
          categoryName: category?.name || null,
          merchantId: item.merchantId,
          merchantName: merchantName || null,
        };
      });

      const paidItems = planInstallments.filter((i) => i.status === "PAID");
      const paidAmount = paidItems.reduce((sum, item) => sum + item.amount, 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);

      expensePlans.push({
        id: `plan_${planId}`,
        planId: planId,
        sourceType: "EXPENSE_TRANSACTION",
        creditor: merchantName || (accountName ? accountName : "Taksitli Borç"),
        description: cleanDesc,
        principalAmount: totalAmount,
        totalAmount,
        paidAmount,
        remainingAmount,
        currency: firstItem.currency || "TRY",
        startDate: firstItem.transactionDate,
        firstPaymentDate: firstItem.transactionDate,
        lastPaymentDate: lastItem.transactionDate,
        installmentCount: items.length,
        installmentAmount: items[0]?.amount || totalAmount / items.length,
        status: remainingAmount <= 0 ? "PAID" : "ACTIVE",
        category: category
          ? {
              id: category.id,
              name: category.name,
              icon: category.icon,
              color: category.color,
            }
          : null,
        merchantName,
        accountName,
        hasReminder: activeReminderRefIds.has(`plan_${planId}`),
        installments: planInstallments,
        createdAt: firstItem.createdAt,
      });
    }

    const mappedDebts = debts.map((debt) => ({
      ...debt,
      sourceType: "DEBT",
    }));

    const allData = [...expensePlans, ...mappedDebts];
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
    const debt = await this.prisma.debt.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { installments: { orderBy: { number: "asc" } } },
    });
    if (!debt) throw new NotFoundException("Borç kaydı bulunamadı.");
    return debt;
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          tenantId,
          creditor: dto.creditor,
          description: dto.description,
          principalAmount: dto.principalAmount,
          totalAmount: dto.totalAmount,
          remainingAmount: dto.totalAmount,
          currency: dto.currency || "TRY",
          startDate: new Date(dto.startDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          installmentCount: dto.installmentCount,
          installmentAmount: dto.installmentAmount,
          firstPaymentDate: new Date(dto.firstPaymentDate),
          interestRate: dto.interestRate,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          merchantId: dto.merchantId,
          createdBy: userId,
        },
      });

      // Auto-generate installments
      const installments: any[] = [];
      const firstDate = new Date(dto.firstPaymentDate);
      for (let i = 0; i < dto.installmentCount; i++) {
        const dueDate = new Date(firstDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          debtId: debt.id,
          number: i + 1,
          amount: dto.installmentAmount,
          dueDate,
          status: "PLANNED" as const,
        });
      }

      await tx.debtInstallment.createMany({ data: installments });

      // Update lastPaymentDate
      const lastDate = new Date(firstDate);
      lastDate.setMonth(lastDate.getMonth() + dto.installmentCount - 1);
      await tx.debt.update({
        where: { id: debt.id },
        data: { lastPaymentDate: lastDate },
      });

      return tx.debt.findUnique({
        where: { id: debt.id },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });
  }

  async payInstallment(
    debtId: string,
    installmentId: string,
    tenantId: string,
    userId: string,
    dto: { amount: number },
  ) {
    const debt = await this.findOne(debtId, tenantId);
    const installment = debt.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException("Taksit bulunamadı.");
    if (installment.status === "PAID" || installment.isPaid)
      throw new BadRequestException("Bu taksit zaten ödenmiş.");

    return this.prisma.$transaction(async (tx) => {
      // Legacy ExpenseTransaction (plan_) Handling
      if (debtId.startsWith("plan_")) {
        if (Number(dto.amount) < installment.amount) {
          throw new BadRequestException("Bu kayıt eski (giderler) altyapısında olduğu için kısmi ödeme desteklenmemektedir. Lütfen tamamını ödeyin.");
        }
        await tx.expenseTransaction.update({
          where: { id: installmentId },
          data: { notes: "PAID" },
        });
        return this.findOne(debtId, tenantId);
      }

      const currentPaid = Number(installment.paidAmount || 0);
      const newPaidAmount = currentPaid + Number(dto.amount);
      const newStatus = newPaidAmount >= installment.amount ? "PAID" : installment.status;

      await tx.debtInstallment.update({
        where: { id: installmentId },
        data: { 
          status: newStatus, 
          paidDate: new Date(), 
          paidAmount: newPaidAmount 
        },
      });

      // Record the cash outflow in ExpenseTransaction
      await tx.expenseTransaction.create({
        data: {
          tenantId,
          transactionDate: new Date(),
          amount: Number(dto.amount),
          currency: debt.currency || "TRY",
          categoryId: debt.categoryId,
          accountId: debt.accountId,
          merchantId: debt.merchantId,
          description: `Borç Ödemesi: ${debt.description || debt.creditor} (${installment.number}. Taksit)`,
          notes: "DEBT_PAYMENT",
          parentId: installmentId, // Link to the installment
          createdBy: userId,
        }
      });

      const newDebtPaidAmount = Number(debt.paidAmount) + Number(dto.amount);
      const newRemainingAmount = Number(debt.totalAmount) - newDebtPaidAmount;
      
      const updatedInstallments = debt.installments.map(i => {
        if (i.id === installmentId) return { ...i, status: newStatus };
        return i;
      });
      const allPaid = updatedInstallments.every((i) => i.status === "PAID");

      await tx.debt.update({
        where: { id: debtId },
        data: {
          paidAmount: newDebtPaidAmount,
          remainingAmount: newRemainingAmount <= 0 ? 0 : newRemainingAmount,
          status: allPaid ? "PAID" : "ACTIVE",
          lastPaymentDate: new Date(),
        },
      });

      return tx.debt.findUnique({
        where: { id: debtId },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });
  }

  async unpayInstallment(
    debtId: string,
    installmentId: string,
    tenantId: string,
    userId: string,
  ) {
    const debt = await this.findOne(debtId, tenantId);
    const installment = debt.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException("Taksit bulunamadı.");
    if (Number(installment.paidAmount || 0) === 0 && !installment.isPaid)
      throw new BadRequestException("Bu taksitte henüz bir ödeme yok.");

    return this.prisma.$transaction(async (tx) => {
      // Legacy ExpenseTransaction (plan_) Handling
      if (debtId.startsWith("plan_")) {
        await tx.expenseTransaction.update({
          where: { id: installmentId },
          data: { notes: null },
        });
        return this.findOne(debtId, tenantId);
      }

      const revertedAmount = Number(installment.paidAmount || 0);

      // Restore status to OVERDUE if dueDate is passed, else PLANNED
      const isOverdue = new Date(installment.dueDate) < new Date();
      const newStatus = isOverdue ? "OVERDUE" : "PLANNED";

      await tx.debtInstallment.update({
        where: { id: installmentId },
        data: { 
          status: newStatus, 
          paidDate: null, 
          paidAmount: 0 
        },
      });

      // Revert the cash outflow by deleting the associated ExpenseTransactions
      await tx.expenseTransaction.deleteMany({
        where: {
          parentId: installmentId,
          notes: "DEBT_PAYMENT",
        }
      });

      const newDebtPaidAmount = Math.max(0, Number(debt.paidAmount) - revertedAmount);
      const newRemainingAmount = Number(debt.totalAmount) - newDebtPaidAmount;

      await tx.debt.update({
        where: { id: debtId },
        data: {
          paidAmount: newDebtPaidAmount,
          remainingAmount: newRemainingAmount <= 0 ? 0 : newRemainingAmount,
          status: "ACTIVE", // Reverting means it can't be PAID anymore
        },
      });

      return tx.debt.findUnique({
        where: { id: debtId },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    if (id.startsWith("plan_")) {
      const planId = id.replace("plan_", "");
      // Update legacy ExpenseTransaction
      await this.prisma.expenseTransaction.updateMany({
        where: { tenantId, installmentPlanId: planId, deletedAt: null },
        data: {
          description: dto.description,
          categoryId: dto.categoryId,
          accountId: dto.accountId,
          merchantId: dto.creditor, // Creditor is mapped to merchantId in legacy
        },
      });
      return this.findOne(id, tenantId);
    }

    await this.findOne(id, tenantId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.debt.update({
        where: { id },
        data: {
          description: dto.description,
          categoryId: dto.categoryId,
          accountId: dto.accountId,
          creditor: dto.creditor,
        },
        include: { installments: { orderBy: { number: "asc" } } },
      });
      return updated;
    });
  }

  async remove(id: string, tenantId: string) {
    if (id.startsWith("plan_")) {
      const planId = id.replace("plan_", "");
      return this.prisma.expenseTransaction.updateMany({
        where: { tenantId, installmentPlanId: planId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }
    const debt = await this.findOne(id, tenantId);
    return this.prisma.$transaction(async (tx) => {
      const deletedDebt = await tx.debt.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      const installmentIds = debt.installments.map((i) => i.id);
      if (installmentIds.length > 0) {
        await tx.expenseTransaction.updateMany({
          where: {
            tenantId,
            parentId: { in: installmentIds },
            notes: "DEBT_PAYMENT",
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
      }
      return deletedDebt;
    });
  }
  async toggleReminder(id: string, tenantId: string, status: boolean, userId: string) {
    if (id.startsWith("plan_")) {
      const planId = id.replace("plan_", "");
      const all = await this.findAll(tenantId, {});
      const item = all.data.find((d: any) => d.id === id);
      if (!item) throw new NotFoundException("Taksit planı bulunamadı.");

      return this.prisma.$transaction(async (tx) => {
        if (status) {
          const unpaidInstallments = item.installments.filter((i: any) => i.status !== "PAID" && !i.isPaid);
          for (const inst of unpaidInstallments) {
            await tx.reminder.create({
              data: {
                tenantId,
                title: `${item.creditor} Taksidi (${inst.number}/${item.installmentCount})`,
                description: item.description,
                amount: inst.amount,
                currency: item.currency,
                dueDate: inst.dueDate,
                isRecurring: false,
                status: "ACTIVE",
                referenceId: id,
                referenceType: "DEBT",
                createdBy: userId,
              }
            });
          }
        } else {
          await tx.reminder.deleteMany({
            where: { tenantId, referenceId: id, referenceType: "DEBT" }
          });
        }
        return { ...item, hasReminder: status };
      });
    }

    const debt = await this.findOne(id, tenantId);
    return this.prisma.$transaction(async (tx) => {
      const updatedDebt = await tx.debt.update({
        where: { id },
        data: { hasReminder: status },
      });

      if (status) {
        const unpaidInstallments = debt.installments.filter(i => i.status !== "PAID" && !i.isPaid);
        for (const inst of unpaidInstallments) {
          await tx.reminder.create({
            data: {
              tenantId,
              title: `${debt.creditor} Taksidi (${inst.number}/${debt.installmentCount})`,
              description: debt.description,
              amount: inst.amount,
              currency: debt.currency,
              dueDate: inst.dueDate,
              isRecurring: false,
              status: "ACTIVE",
              referenceId: debt.id,
              referenceType: "DEBT",
              createdBy: userId,
            }
          });
        }
      } else {
        await tx.reminder.deleteMany({
          where: { tenantId, referenceId: debt.id, referenceType: "DEBT" }
        });
      }

      return updatedDebt;
    });
  }
}
