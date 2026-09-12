import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const where: any = { tenantId, deletedAt: null };
    if (query.startDate && query.endDate) {
      where.startDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }
    return this.prisma.event.findMany({ where, orderBy: { startDate: "asc" } });
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.event.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(id: string, tenantId: string, dto: any) {
    const e = await this.prisma.event.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!e) throw new NotFoundException("Etkinlik bulunamadı.");
    if (dto.startDate) dto.startDate = new Date(dto.startDate);
    if (dto.endDate) dto.endDate = new Date(dto.endDate);
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    const e = await this.prisma.event.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!e) throw new NotFoundException("Etkinlik bulunamadı.");
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
