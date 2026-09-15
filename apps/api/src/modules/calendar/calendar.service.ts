import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CalendarItem {
  id: string;
  type: 'DEBT_INSTALLMENT' | 'RECEIVABLE_INSTALLMENT' | 'REMINDER';
  title: string;
  description?: string;
  date: string;
  amount?: number;
  currency: string;
  status: string;
  color: string;
  meta: {
    debtId?: string;
    installmentNumber?: number;
    installmentTotal?: number;
    creditor?: string;
    debtorName?: string;
    reminderId?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
  };
}

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getCalendarItems(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<CalendarItem[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const items: CalendarItem[] = [];

    // 1. Debt Installments (from Debt model)
    const debtInstallments = await this.prisma.debtInstallment.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        debt: { tenantId, deletedAt: null },
      },
      include: {
        debt: { select: { id: true, creditor: true, description: true, currency: true, installmentCount: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    for (const inst of debtInstallments) {
      const dueDate = new Date(inst.dueDate);
      const isPaid = inst.status === 'PAID';
      const isOverdue = !isPaid && dueDate < now;
      const isToday = !isPaid && dueDate.toDateString() === now.toDateString();

      let color = '#3b82f6'; // blue - planned
      let status: string = inst.status;
      if (isPaid) { color = '#64748b'; status = 'PAID'; }
      else if (isOverdue) { color = '#f43f5e'; status = 'OVERDUE'; }
      else if (isToday) { color = '#f59e0b'; status = 'DUE_TODAY'; }

      items.push({
        id: `debt_inst_${inst.id}`,
        type: 'DEBT_INSTALLMENT',
        title: `${inst.debt.creditor} (${inst.number}/${inst.debt.installmentCount})`,
        description: inst.debt.description || undefined,
        date: inst.dueDate.toISOString(),
        amount: inst.amount,
        currency: inst.debt.currency,
        status,
        color,
        meta: {
          debtId: inst.debt.id,
          installmentNumber: inst.number,
          installmentTotal: inst.debt.installmentCount,
          creditor: inst.debt.creditor,
        },
      });
    }

    // 2. Debt Installments from legacy ExpenseTransaction (plan_ based)
    const expenseInstallments = await this.prisma.expenseTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        installmentPlanId: { not: null },
        transactionDate: { gte: start, lte: end },
      },
      orderBy: { transactionDate: 'asc' },
    });

    // Group by installmentPlanId
    const expensePlanGroups = new Map<string, any[]>();
    for (const exp of expenseInstallments) {
      if (!exp.installmentPlanId) continue;
      if (!expensePlanGroups.has(exp.installmentPlanId)) {
        expensePlanGroups.set(exp.installmentPlanId, []);
      }
      expensePlanGroups.get(exp.installmentPlanId)!.push(exp);
    }

    // Need total count per plan (fetch all items for count)
    const allExpensePlans = await this.prisma.expenseTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        installmentPlanId: { in: Array.from(expensePlanGroups.keys()) },
      },
      select: { installmentPlanId: true, id: true },
    });
    const planTotalCounts = new Map<string, number>();
    for (const exp of allExpensePlans) {
      if (!exp.installmentPlanId) continue;
      planTotalCounts.set(exp.installmentPlanId, (planTotalCounts.get(exp.installmentPlanId) || 0) + 1);
    }

    // Sort items within each plan to get installment numbers
    const allExpensePlansSorted = await this.prisma.expenseTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        installmentPlanId: { in: Array.from(expensePlanGroups.keys()) },
      },
      orderBy: { transactionDate: 'asc' },
      select: { id: true, installmentPlanId: true },
    });
    const planInstallmentNumbers = new Map<string, number>();
    const planCurrentIdx = new Map<string, number>();
    for (const exp of allExpensePlansSorted) {
      if (!exp.installmentPlanId) continue;
      const idx = (planCurrentIdx.get(exp.installmentPlanId) || 0) + 1;
      planCurrentIdx.set(exp.installmentPlanId, idx);
      planInstallmentNumbers.set(exp.id, idx);
    }

    // Get merchants for labels
    const merchants = await this.prisma.merchant.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    const merchantMap = new Map(merchants.map(m => [m.id, m.name]));

    for (const [planId, planItems] of expensePlanGroups) {
      const totalCount = planTotalCounts.get(planId) || planItems.length;
      for (const exp of planItems) {
        const dueDate = new Date(exp.transactionDate);
        const isPaid = exp.notes === 'PAID';
        const isOverdue = !isPaid && dueDate < now;
        const isToday = !isPaid && dueDate.toDateString() === now.toDateString();
        const instNum = planInstallmentNumbers.get(exp.id) || 1;

        let color = '#3b82f6'; // blue
        let status = 'PLANNED';
        if (isPaid) { color = '#64748b'; status = 'PAID'; }
        else if (isOverdue) { color = '#f43f5e'; status = 'OVERDUE'; }
        else if (isToday) { color = '#f59e0b'; status = 'DUE_TODAY'; }

        const rawDesc = exp.description || '';
        const cleanDesc = rawDesc.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || 'Taksitli Borç';
        const creditorName = exp.merchantId ? (merchantMap.get(exp.merchantId) || cleanDesc) : cleanDesc;

        items.push({
          id: `debt_exp_${exp.id}`,
          type: 'DEBT_INSTALLMENT',
          title: `${creditorName} (${instNum}/${totalCount})`,
          description: cleanDesc,
          date: exp.transactionDate.toISOString(),
          amount: exp.amount,
          currency: exp.currency || 'TRY',
          status,
          color,
          meta: {
            debtId: `plan_${planId}`,
            installmentNumber: instNum,
            installmentTotal: totalCount,
            creditor: creditorName,
          },
        });
      }
    }

    // 3. Receivable installments from IncomeTransaction (parentId based)
    const incomeInstallments = await this.prisma.incomeTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        parentId: { not: null },
        transactionDate: { gte: start, lte: end },
      },
      orderBy: { transactionDate: 'asc' },
    });

    // Group by parentId
    const incomePlanGroups = new Map<string, any[]>();
    for (const inc of incomeInstallments) {
      if (!inc.parentId) continue;
      if (!incomePlanGroups.has(inc.parentId)) {
        incomePlanGroups.set(inc.parentId, []);
      }
      incomePlanGroups.get(inc.parentId)!.push(inc);
    }

    // Total counts for income plans
    const allIncomePlans = await this.prisma.incomeTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        parentId: { in: Array.from(incomePlanGroups.keys()) },
      },
      select: { parentId: true, id: true },
    });
    const incomePlanTotalCounts = new Map<string, number>();
    for (const inc of allIncomePlans) {
      if (!inc.parentId) continue;
      incomePlanTotalCounts.set(inc.parentId, (incomePlanTotalCounts.get(inc.parentId) || 0) + 1);
    }

    // Installment numbers
    const allIncomePlansSorted = await this.prisma.incomeTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        parentId: { in: Array.from(incomePlanGroups.keys()) },
      },
      orderBy: { transactionDate: 'asc' },
      select: { id: true, parentId: true },
    });
    const incomeInstallmentNumbers = new Map<string, number>();
    const incomeCurrentIdx = new Map<string, number>();
    for (const inc of allIncomePlansSorted) {
      if (!inc.parentId) continue;
      const idx = (incomeCurrentIdx.get(inc.parentId) || 0) + 1;
      incomeCurrentIdx.set(inc.parentId, idx);
      incomeInstallmentNumbers.set(inc.id, idx);
    }

    for (const [planId, planItems] of incomePlanGroups) {
      const totalCount = incomePlanTotalCounts.get(planId) || planItems.length;
      for (const inc of planItems) {
        const dueDate = new Date(inc.transactionDate);
        const isCollected = inc.recurrenceRule === 'COLLECTED';
        const isOverdue = !isCollected && dueDate < now;
        const instNum = incomeInstallmentNumbers.get(inc.id) || 1;

        let color = '#10b981'; // green - receivable
        let status = 'PLANNED';
        if (isCollected) { color = '#64748b'; status = 'COLLECTED'; }
        else if (isOverdue) { color = '#f59e0b'; status = 'OVERDUE'; }

        const debtorName = inc.source || 'Taksitli Alacak';
        const rawDesc = inc.description || '';
        const cleanDesc = rawDesc.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || debtorName;

        items.push({
          id: `recv_inc_${inc.id}`,
          type: 'RECEIVABLE_INSTALLMENT',
          title: `${debtorName} (${instNum}/${totalCount})`,
          description: cleanDesc,
          date: inc.transactionDate.toISOString(),
          amount: inc.amount,
          currency: inc.currency || 'TRY',
          status,
          color,
          meta: {
            debtId: `plan_${planId}`,
            installmentNumber: instNum,
            installmentTotal: totalCount,
            debtorName,
          },
        });
      }
    }

    // 4. Reminders (ACTIVE only)
    const reminders = await this.prisma.reminder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: 'ACTIVE',
        dueDate: { gte: start, lte: end },
      },
      orderBy: { dueDate: 'asc' },
    });

    for (const rem of reminders) {
      const dueDate = new Date(rem.dueDate);
      const isOverdue = dueDate < now;
      const isToday = dueDate.toDateString() === now.toDateString();

      let color = '#8b5cf6'; // purple - reminder
      let status = 'ACTIVE';
      if (isOverdue) { color = '#f43f5e'; status = 'OVERDUE'; }
      else if (isToday) { color = '#f59e0b'; status = 'DUE_TODAY'; }

      items.push({
        id: `reminder_${rem.id}`,
        type: 'REMINDER',
        title: rem.title,
        description: rem.description || undefined,
        date: rem.dueDate.toISOString(),
        amount: rem.amount || undefined,
        currency: rem.currency,
        status,
        color,
        meta: {
          reminderId: rem.id,
          isRecurring: rem.isRecurring,
          recurrenceRule: rem.recurrenceRule || undefined,
        },
      });
    }

    // Sort all items by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return items;
  }

  async getCalendarSummary(tenantId: string, startDate: string, endDate: string) {
    const items = await this.getCalendarItems(tenantId, startDate, endDate);

    const debtItems = items.filter(i => i.type === 'DEBT_INSTALLMENT');
    const receivableItems = items.filter(i => i.type === 'RECEIVABLE_INSTALLMENT');
    const reminderItems = items.filter(i => i.type === 'REMINDER');

    const overdueItems = items.filter(i => i.status === 'OVERDUE');
    const dueTodayItems = items.filter(i => i.status === 'DUE_TODAY');

    return {
      totalDebtAmount: debtItems.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + (i.amount || 0), 0),
      totalReceivableAmount: receivableItems.filter(i => i.status !== 'COLLECTED').reduce((sum, i) => sum + (i.amount || 0), 0),
      overdueCount: overdueItems.length,
      dueTodayCount: dueTodayItems.length,
      activeReminderCount: reminderItems.length,
      debtInstallmentCount: debtItems.filter(i => i.status !== 'PAID').length,
      receivableInstallmentCount: receivableItems.filter(i => i.status !== 'COLLECTED').length,
    };
  }
}
