import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortBy, sortOrder } = parsePagination(query);

    const where = { tenantId, deletedAt: null };

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.account.count({ where }),
    ]);

    const accountIds = accounts.map(a => a.id);
    
    const [incomes, expenses] = await Promise.all([
      this.prisma.incomeTransaction.groupBy({
        by: ['accountId'],
        where: { tenantId, accountId: { in: accountIds }, deletedAt: null },
        _sum: { amount: true }
      }),
      this.prisma.expenseTransaction.groupBy({
        by: ['accountId'],
        where: { tenantId, accountId: { in: accountIds }, deletedAt: null },
        _sum: { amount: true }
      })
    ]);

    const data = accounts.map(account => {
      const inc = incomes.find(i => i.accountId === account.id)?._sum.amount || 0;
      const exp = expenses.find(e => e.accountId === account.id)?._sum.amount || 0;
      return {
        ...account,
        currentBalance: account.initialBalance + inc - exp
      };
    });

    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async findOne(id: string, tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!account) throw new NotFoundException("Hesap bulunamadı.");

    const [inc, exp] = await Promise.all([
      this.prisma.incomeTransaction.aggregate({
        where: { tenantId, accountId: id, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.expenseTransaction.aggregate({
        where: { tenantId, accountId: id, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...account,
      currentBalance: account.initialBalance + (inc._sum.amount || 0) - (exp._sum.amount || 0),
    };
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.account.create({
      data: { ...dto, tenantId, createdBy: userId },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    await this.findOne(id, tenantId);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getTransactions(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // verify existence and tenant
    
    const [incomes, expenses] = await Promise.all([
      this.prisma.incomeTransaction.findMany({
        where: { tenantId, accountId: id, deletedAt: null },
        orderBy: { transactionDate: 'desc' }
      }),
      this.prisma.expenseTransaction.findMany({
        where: { tenantId, accountId: id, deletedAt: null },
        orderBy: { transactionDate: 'desc' }
      })
    ]);

    // Map to a common format
    const transactions = [
      ...incomes.map(i => ({ ...i, transactionType: 'INCOME' })),
      ...expenses.map(e => ({ ...e, transactionType: 'EXPENSE' }))
    ];

    // Sort combined by date descending
    transactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

    return transactions;
  }
}
