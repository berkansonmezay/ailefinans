import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortBy, sortOrder } = parsePagination(query);

    const where = { tenantId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.account.count({ where }),
    ]);

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
    return account;
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
}
