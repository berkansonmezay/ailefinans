import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKPIs(tenantId: string, startDate: Date, endDate: Date) {
    const [
      incomes,
      expenses,
      debts,
      receivables,
      savingsGoals,
      subscriptions,
      invoices,
      warranties,
      events,
      installments,
    ] = await Promise.all([
      this.prisma.incomeTransaction.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.expenseTransaction.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.debt.aggregate({
        where: { tenantId, deletedAt: null, status: "ACTIVE" },
        _sum: { remainingAmount: true },
      }),
      this.prisma.receivable.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
        _sum: { remainingAmount: true },
      }),
      this.prisma.savingsGoal.aggregate({
        where: { tenantId, deletedAt: null, status: "ACTIVE" },
        _sum: { currentAmount: true },
      }),
      this.prisma.subscription.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: "ACTIVE",
          frequency: "MONTHLY",
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: {
          tenantId,
          deletedAt: null,
          status: "UNPAID",
          dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.warranty.count({
        where: {
          tenantId,
          deletedAt: null,
          warrantyEndDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      this.prisma.event.count({
        where: {
          tenantId,
          deletedAt: null,
          startDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.debtInstallment.count({
        where: {
          debt: { tenantId, deletedAt: null },
          status: { in: ["PLANNED", "DUE_SOON", "DUE"] },
          dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalIncome = incomes._sum.amount?.toString() || "0";
    const totalExpense = expenses._sum.amount?.toString() || "0";
    const netCashFlow = (
      parseFloat(totalIncome) - parseFloat(totalExpense)
    ).toFixed(2);

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      totalDebt: debts._sum.remainingAmount?.toString() || "0",
      upcomingInstallments: installments,
      totalReceivable: receivables._sum.remainingAmount?.toString() || "0",
      monthlySavings: parseFloat(netCashFlow) > 0 ? netCashFlow : "0",
      totalSavings: savingsGoals._sum.currentAmount?.toString() || "0",
      monthlySubscriptionCost: subscriptions._sum.amount?.toString() || "0",
      upcomingInvoices: invoices,
      upcomingWarrantyExpiries: warranties,
      upcomingEvents: events,
    };
  }

  async getMonthlyChart(tenantId: string, months: number = 6) {
    const result: any[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      const [income, expense] = await Promise.all([
        this.prisma.incomeTransaction.aggregate({
          where: {
            tenantId,
            deletedAt: null,
            transactionDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.expenseTransaction.aggregate({
          where: {
            tenantId,
            deletedAt: null,
            transactionDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
      ]);
      result.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        income: parseFloat(income._sum.amount?.toString() || "0"),
        expense: parseFloat(expense._sum.amount?.toString() || "0"),
      });
    }
    return result;
  }

  async getCategoryBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    const expenses = await this.prisma.expenseTransaction.groupBy({
      by: ["categoryId"],
      where: {
        tenantId,
        deletedAt: null,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const categories = await this.prisma.category.findMany({
      where: { tenantId, type: "EXPENSE" },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    return expenses.map((e) => ({
      label: catMap.get(e.categoryId || "") || "Diğer",
      value: parseFloat(e._sum.amount?.toString() || "0"),
    }));
  }

  async getMerchantBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    const expenses = await this.prisma.expenseTransaction.groupBy({
      by: ["merchantId"],
      where: {
        tenantId,
        deletedAt: null,
        merchantId: { not: null },
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const merchants = await this.prisma.merchant.findMany({
      where: { tenantId },
    });
    const merchMap = new Map(merchants.map((m) => [m.id, m.name]));

    return expenses.map((e) => ({
      label: merchMap.get(e.merchantId || "") || "Bilinmiyor",
      value: parseFloat(e._sum.amount?.toString() || "0"),
    }));
  }

  async compareYears(tenantId: string, years: number[]) {
    if (!years || years.length === 0) return [];

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const startDate = new Date(minYear, 0, 1);
    const endDate = new Date(maxYear, 11, 31, 23, 59, 59);

    const [incomes, expenses] = await Promise.all([
      this.prisma.incomeTransaction.findMany({
        where: {
          tenantId,
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        select: { transactionDate: true, amount: true }
      }),
      this.prisma.expenseTransaction.findMany({
        where: {
          tenantId,
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        select: { transactionDate: true, amount: true }
      })
    ]);

    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    // Initialize results structure
    const results = months.map((monthName) => {
      const monthData: any = { month: monthName };
      years.forEach(year => {
        monthData[`income_${year}`] = 0;
        monthData[`expense_${year}`] = 0;
      });
      return monthData;
    });

    // Aggregate incomes
    incomes.forEach(tx => {
      const date = new Date(tx.transactionDate);
      const year = date.getFullYear();
      if (years.includes(year)) {
        const monthIndex = date.getMonth();
        results[monthIndex][`income_${year}`] += parseFloat(tx.amount.toString());
      }
    });

    // Aggregate expenses
    expenses.forEach(tx => {
      const date = new Date(tx.transactionDate);
      const year = date.getFullYear();
      if (years.includes(year)) {
        const monthIndex = date.getMonth();
        results[monthIndex][`expense_${year}`] += parseFloat(tx.amount.toString());
      }
    });

    return results;
  }

  async getYearlyExpenses(tenantId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const expenses = await this.prisma.expenseTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        transactionDate: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        transactionDate: true,
        categoryId: true,
        merchantId: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: { tenantId, type: "EXPENSE" },
    });

    const merchants = await this.prisma.merchant.findMany({
      where: { tenantId },
    });

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const merchMap = new Map(merchants.map((m) => [m.id, m]));
    const parentGroups = new Map<string, any>();

    const getOrCreateParent = (id: string, name: string) => {
      if (!parentGroups.has(id)) {
        parentGroups.set(id, {
          id,
          name,
          months: Array(12).fill(0),
          total: 0,
          subCategories: new Map<string, any>(),
        });
      }
      return parentGroups.get(id);
    };

    expenses.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const month = date.getMonth();
      const amount = parseFloat(tx.amount.toString());

      let parentId = "unspecified_merchant";
      let parentName = "Belirtilmemiş (Kurum Yok)";
      let childId = "uncategorized";
      let childName = "Kategorisiz";

      if (tx.merchantId && merchMap.has(tx.merchantId)) {
        const m = merchMap.get(tx.merchantId)!;
        parentId = m.id;
        parentName = m.name;
      }

      if (tx.categoryId && catMap.has(tx.categoryId)) {
        const cat = catMap.get(tx.categoryId)!;
        childId = cat.id;
        childName = cat.name;
      }

      const parentGroup = getOrCreateParent(parentId, parentName);

      // Add to parent totals
      parentGroup.months[month] += amount;
      parentGroup.total += amount;

      if (!parentGroup.subCategories.has(childId)) {
        parentGroup.subCategories.set(childId, {
          id: childId,
          name: childName,
          months: Array(12).fill(0),
          total: 0,
        });
      }

      const childGroup = parentGroup.subCategories.get(childId);
      childGroup.months[month] += amount;
      childGroup.total += amount;
    });

    // Format the result
    return Array.from(parentGroups.values())
      .map((p) => ({
        id: p.id,
        name: p.name,
        months: p.months.map((m: number) => Number(m.toFixed(2))),
        total: Number(p.total.toFixed(2)),
        subCategories: Array.from(p.subCategories.values())
          .map((c: any) => ({
            ...c,
            months: c.months.map((m: number) => Number(m.toFixed(2))),
            total: Number(c.total.toFixed(2)),
          }))
          .sort((a: any, b: any) => b.total - a.total),
      }))
      .sort((a: any, b: any) => b.total - a.total);
  }

  async getMonthlyTrends(tenantId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const expenses = await this.prisma.expenseTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        transactionDate: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        transactionDate: true,
        categoryId: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: { tenantId, type: "EXPENSE" },
    });

    const catMap = new Map(categories.map((c) => [c.id, c]));

    const childGroups = new Map<string, any>();
    const parentGroups = new Map<string, any>();

    const getOrCreateGroup = (map: Map<string, any>, id: string, name: string) => {
      if (!map.has(id)) {
        map.set(id, { id, name, months: Array(12).fill(0), total: 0 });
      }
      return map.get(id);
    };

    expenses.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const month = date.getMonth();
      const amount = parseFloat(tx.amount.toString());

      let parentId = "uncategorized";
      let parentName = "Diğer";
      let childId = "uncategorized";
      let childName = "Genel";

      if (tx.categoryId && catMap.has(tx.categoryId)) {
        const cat = catMap.get(tx.categoryId)!;
        parentId = cat.parentId ? cat.parentId : cat.id;
        const parentCat = cat.parentId ? catMap.get(cat.parentId) : cat;
        parentName = parentCat ? parentCat.name : "Diğer";
        childId = cat.id;
        childName = cat.name;
      }

      const pGroup = getOrCreateGroup(parentGroups, parentId, parentName);
      pGroup.months[month] += amount;
      pGroup.total += amount;

      const cGroup = getOrCreateGroup(childGroups, childId, childName);
      cGroup.months[month] += amount;
      cGroup.total += amount;
    });

    return {
      categoryTrends: Array.from(childGroups.values())
        .map((g: any) => ({ ...g, months: g.months.map((m: number) => Number(m.toFixed(2))), total: Number(g.total.toFixed(2)) }))
        .sort((a, b) => b.total - a.total),
      parentCategoryTrends: Array.from(parentGroups.values())
        .map((g: any) => ({ ...g, months: g.months.map((m: number) => Number(m.toFixed(2))), total: Number(g.total.toFixed(2)) }))
        .sort((a, b) => b.total - a.total)
    };
  }
}
