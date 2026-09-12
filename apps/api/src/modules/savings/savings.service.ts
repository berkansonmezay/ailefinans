import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

@Injectable()
export class SavingsService {
  constructor(private prisma: PrismaService) {}

  async findAllGoals(tenantId: string) {
    return this.prisma.savingsGoal.findMany({
      where: { tenantId, deletedAt: null },
      include: { transactions: { orderBy: { date: "desc" }, take: 10 } },
      orderBy: { priority: "desc" },
    });
  }

  async findOneGoal(id: string, tenantId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { transactions: { orderBy: { date: "desc" } } },
    });
    if (!goal) throw new NotFoundException("Tasarruf hedefi bulunamadı.");
    return goal;
  }

  async createGoal(tenantId: string, userId: string, dto: any) {
    return this.prisma.savingsGoal.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        currency: dto.currency || "TRY",
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        priority: dto.priority || 0,
        icon: dto.icon,
        color: dto.color,
        createdBy: userId,
      },
    });
  }

  async updateGoal(id: string, tenantId: string, dto: any) {
    await this.findOneGoal(id, tenantId);
    if (dto.targetDate) dto.targetDate = new Date(dto.targetDate);
    return this.prisma.savingsGoal.update({ where: { id }, data: dto });
  }

  async addTransaction(
    goalId: string,
    tenantId: string,
    userId: string,
    dto: { amount: number; type: string; description?: string },
  ) {
    const goal = await this.findOneGoal(goalId, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await tx.savingsTransaction.create({
        data: {
          goalId,
          amount: dto.amount,
          type: dto.type as any,
          description: dto.description,
          createdBy: userId,
        },
      });
      const delta =
        dto.type === "DEPOSIT"
          ? Number(dto.amount)
          : -Number(dto.amount);
      const newAmount = Number(goal.currentAmount) + delta;
      const status = newAmount >= Number(goal.targetAmount)
        ? "COMPLETED"
        : goal.status;
      return tx.savingsGoal.update({
        where: { id: goalId },
        data: { currentAmount: newAmount < 0 ? 0 : newAmount, status },
        include: { transactions: { orderBy: { date: "desc" } } },
      });
    });
  }

  async removeGoal(id: string, tenantId: string) {
    await this.findOneGoal(id, tenantId);
    return this.prisma.savingsGoal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
