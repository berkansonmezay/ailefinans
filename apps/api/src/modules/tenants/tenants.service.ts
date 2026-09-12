import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getUserTenants(userId: string) {
    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId, isActive: true },
      include: { tenant: true },
    });
    return memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      role: m.role,
      currency: m.tenant.currency,
      joinedAt: m.joinedAt,
    }));
  }

  async getTenant(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        tenant: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException("Bu aileye erişim yetkiniz yok.");
    }

    return {
      ...membership.tenant,
      members: membership.tenant.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async updateTenant(
    tenantId: string,
    userId: string,
    data: { name?: string; currency?: string },
  ) {
    await this.requireRole(tenantId, userId, ["OWNER", "ADMIN"]);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async addMember(
    tenantId: string,
    requesterId: string,
    dto: { email: string; role: string },
  ) {
    await this.requireRole(tenantId, requesterId, ["OWNER", "ADMIN"]);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException(
        "Bu e-posta adresine ait kullanıcı bulunamadı.",
      );
    }

    const existing = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ForbiddenException("Bu kullanıcı zaten aile üyesi.");
      }
      // Reactivate
      return this.prisma.tenantMember.update({
        where: { id: existing.id },
        data: { isActive: true, role: dto.role as any },
      });
    }

    return this.prisma.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        role: dto.role as any,
      },
    });
  }

  async removeMember(
    tenantId: string,
    requesterId: string,
    memberUserId: string,
  ) {
    await this.requireRole(tenantId, requesterId, ["OWNER"]);

    if (requesterId === memberUserId) {
      throw new ForbiddenException("Kendinizi aileden çıkaramazsınız.");
    }

    return this.prisma.tenantMember.updateMany({
      where: { tenantId, userId: memberUserId },
      data: { isActive: false },
    });
  }

  async createTenant(userId: string, data: { name: string; currency?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          currency: data.currency || 'TRY',
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: userId,
          role: "OWNER",
        },
      });

      // Seed default categories
      const defaultExpenseCategories = [
        "Market", "Fatura", "Ulaşım", "Konut", "Sağlık", 
        "Eğitim", "Giyim", "Eğlence", "Kozmetik", "Diğer"
      ];
      const defaultIncomeCategories = [
        "Maaş", "Prim", "Yatırım", "Kira", "Ek Gelir"
      ];

      const categoryCreates = [
        ...defaultExpenseCategories.map((name) => ({
          tenantId: tenant.id,
          name,
          type: "EXPENSE" as any,
          color: "#ef4444",
        })),
        ...defaultIncomeCategories.map((name) => ({
          tenantId: tenant.id,
          name,
          type: "INCOME" as any,
          color: "#10b981",
        })),
      ];

      await tx.category.createMany({
        data: categoryCreates,
      });

      return tenant;
    });
  }

  async deleteTenant(tenantId: string, userId: string) {
    await this.requireRole(tenantId, userId, ["OWNER"]);
    
    // In a real application, you might want to soft delete or cascade delete everything.
    // Given the schema, we can just delete the tenant, but Prisma needs to cascade delete 
    // depending on the schema configuration. Since Prisma cascade is usually enabled on foreign keys,
    // this should delete tenant members, transactions, categories etc.
    return this.prisma.tenant.delete({
      where: { id: tenantId }
    });
  }

  private async requireRole(tenantId: string, userId: string, roles: string[]) {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (
      !membership ||
      !membership.isActive ||
      !roles.includes(membership.role)
    ) {
      throw new ForbiddenException("Bu işlem için yetkiniz bulunmamaktadır.");
    }
  }
}
