import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { MailService } from "../auth/mail.service";

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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
    dto: {
      email: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
    },
  ) {
    await this.requireRole(tenantId, requesterId, ["OWNER", "ADMIN"]);

    if (!dto.email || !dto.email.trim()) {
      throw new BadRequestException("E-posta adresi gereklidir.");
    }

    const email = dto.email.toLowerCase().trim();
    const role = (dto.role as any) || "MEMBER";

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Aile bulunamadı.");

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    if (!user) {
      // Model 1: Doğrudan yeni kullanıcı oluştur
      const firstName = dto.firstName?.trim();
      const lastName = dto.lastName?.trim();

      if (!firstName || !lastName) {
        throw new BadRequestException(
          "Yeni kullanıcı oluşturmak için Ad ve Soyad alanları zorunludur.",
        );
      }

      const password = dto.password?.trim() || Math.random().toString(36).slice(-8) + "1Aa!";
      if (password.length < 6) {
        throw new BadRequestException("Şifre en az 6 karakter olmalıdır.");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "uye";
      const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          passwordHash,
          isActive: true, // Aile yöneticisi eklediği için doğrudan aktif
          systemRole: "USER",
        },
      });

      isNewUser = true;

      // E-posta ile davet/giriş bilgilerini gönder (hata alsa bile kullanıcı oluşturmayı engellemez)
      this.mailService
        .sendFamilyInvitationEmail(user.email, {
          name: `${user.firstName} ${user.lastName}`,
          inviterName: requester ? `${requester.firstName} ${requester.lastName}` : "Aile Yöneticiniz",
          familyName: tenant.name,
          temporaryPassword: password,
          loginUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`,
        })
        .catch(() => {});
    }

    // Üyelik kontrolü
    const existing = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ForbiddenException("Bu kullanıcı zaten bu ailenin üyesi.");
      }
      // Yeniden aktifleştir
      const updated = await this.prisma.tenantMember.update({
        where: { id: existing.id },
        data: { isActive: true, role },
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
      });

      return {
        ...updated,
        isNewUser: false,
        message: "Kullanıcı aileye dahil edildi.",
      };
    }

    const membership = await this.prisma.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        role,
      },
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
    });

    return {
      ...membership,
      isNewUser,
      message: isNewUser
        ? "Yeni kullanıcı oluşturuldu ve aileye eklendi."
        : "Kayıtlı kullanıcı aileye eklendi.",
    };
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

      // Seed default categories (1 sample category each)
      const defaultExpenseCategories = ["Genel Gider"];
      const defaultIncomeCategories = ["Maaş"];

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
