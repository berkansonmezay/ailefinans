import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, period: string) {
    // If period is not provided, use current month like '2026-09'
    const targetPeriod = period || new Date().toISOString().substring(0, 7);
    
    return this.prisma.budget.findMany({
      where: { 
        tenantId,
        period: targetPeriod
      },
      include: {
        tenant: {
          select: {
            categories: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, userId: string, data: any) {
    const existing = await this.prisma.budget.findFirst({
      where: {
        tenantId,
        categoryId: data.categoryId,
        period: data.period,
      }
    });

    if (existing) {
      // If it exists, update it instead
      return this.update(existing.id, tenantId, data);
    }

    return this.prisma.budget.create({
      data: {
        tenantId,
        categoryId: data.categoryId,
        amount: data.amount,
        currency: data.currency || 'TRY',
        period: data.period,
        createdBy: userId,
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, tenantId },
    });

    if (!budget) throw new NotFoundException('Bütçe kaydı bulunamadı');

    return this.prisma.budget.update({
      where: { id },
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        period: data.period,
        currency: data.currency,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, tenantId },
    });

    if (!budget) throw new NotFoundException('Bütçe kaydı bulunamadı');

    return this.prisma.budget.delete({
      where: { id },
    });
  }
}
