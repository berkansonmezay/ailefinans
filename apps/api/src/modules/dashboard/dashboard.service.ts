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
}
