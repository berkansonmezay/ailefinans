import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nextPaymentDate: "asc" },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.subscription.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        startDate: new Date(dto.startDate),
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : new Date(dto.startDate),
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Abonelik bulunamadı.");
    
    const dataToUpdate = { ...dto };
    if (dataToUpdate.startDate) dataToUpdate.startDate = new Date(dataToUpdate.startDate);
    if (dataToUpdate.nextPaymentDate) dataToUpdate.nextPaymentDate = new Date(dataToUpdate.nextPaymentDate);
    
    return this.prisma.subscription.update({ where: { id }, data: dataToUpdate });
  }

  async remove(id: string, tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Abonelik bulunamadı.");
    return this.prisma.subscription.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
