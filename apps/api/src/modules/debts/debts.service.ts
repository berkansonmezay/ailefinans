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
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.debt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: sortOrder },
        include: { installments: { orderBy: { number: "asc" } } },
      }),
      this.prisma.debt.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async findOne(id: string, tenantId: string) {
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
    if (installment.status === "PAID")
      throw new BadRequestException("Bu taksit zaten ödenmiş.");

    return this.prisma.$transaction(async (tx) => {
      await tx.debtInstallment.update({
        where: { id: installmentId },
        data: { status: "PAID", paidDate: new Date(), paidAmount: dto.amount },
      });

      const newPaidAmount = Number(debt.paidAmount) + Number(dto.amount);
      const newRemainingAmount = Number(debt.totalAmount) - newPaidAmount;
      const allPaid = debt.installments
        .filter((i) => i.id !== installmentId)
        .every((i) => i.status === "PAID");

      await tx.debt.update({
        where: { id: debtId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount <= 0 ? 0 : newRemainingAmount,
          status: allPaid ? "PAID" : "ACTIVE",
        },
      });

      return tx.debt.findUnique({
        where: { id: debtId },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.debt.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
