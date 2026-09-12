import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, type?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (type) where.type = type;
    return this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: true },
    });
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.category.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, tenantId: string, dto: any) {
    const cat = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!cat) throw new NotFoundException("Kategori bulunamadı.");
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!cat) throw new NotFoundException("Kategori bulunamadı.");
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
