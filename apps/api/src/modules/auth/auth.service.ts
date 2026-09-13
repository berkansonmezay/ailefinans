import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "./mail.service";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName: string;
  }) {
    // Check if email or username exists
    const existing = await this.prisma.user.findFirst({
      where: { 
        OR: [
          { email: dto.email },
          { username: dto.username }
        ]
      },
    });
    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException("Bu e-posta adresi zaten kayıtlı.");
      }
      if (existing.username === dto.username) {
        throw new ConflictException("Bu kullanıcı adı zaten kullanımda.");
      }
    }

    // Hash password (bcrypt, 12 rounds)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const userCount = await this.prisma.user.count();
    const isFirstUser = userCount === 0;

    // Create user + tenant + membership in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          systemRole: isFirstUser ? 'SUPER_ADMIN' : 'USER',
          isActive: isFirstUser, // First user is automatically active
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Seed default categories for this tenant
      const defaultExpenseCategories = [
        "Market",
        "Fatura",
        "Ulaşım",
        "Konut",
        "Sağlık",
        "Eğitim",
        "Giyim",
        "Restoran",
        "Eğlence",
        "Tatil",
        "Teknoloji",
        "Çocuk",
        "Ev",
        "Sigorta",
        "Vergi",
        "Diğer",
      ];
      const defaultIncomeCategories = [
        "Maaş",
        "Prim",
        "Serbest Gelir",
        "Kira Geliri",
        "Faiz",
        "Yatırım Geliri",
        "Diğer",
      ];

      for (const name of defaultExpenseCategories) {
        await tx.category.create({
          data: { tenantId: tenant.id, name, type: "EXPENSE", isSystem: true },
        });
      }
      for (const name of defaultIncomeCategories) {
        await tx.category.create({
          data: { tenantId: tenant.id, name, type: "INCOME", isSystem: true },
        });
      }

      return { user, tenant };
    });

    return {
      message: isFirstUser 
        ? "Kurucu hesabınız başarıyla oluşturuldu ve otomatik olarak onaylandı. Giriş yapabilirsiniz." 
        : "Hesabınız başarıyla oluşturuldu. Sistem yöneticisinin onayından sonra giriş yapabilirsiniz.",
      status: isFirstUser ? "APPROVED" : "PENDING_APPROVAL"
    };
  }

  async login(dto: { identifier: string; password: string }) {
    console.log('Login attempt with identifier:', dto.identifier);
    const user = await this.prisma.user.findFirst({
      where: { 
        OR: [
          { email: dto.identifier },
          { username: dto.identifier }
        ]
      },
      include: {
        memberships: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      console.log('Login failed: user not found');
      throw new UnauthorizedException("Geçersiz e-posta veya şifre.");
    }

    if (!user.isActive) {
      console.log('Login failed: user not active');
      throw new UnauthorizedException("Hesabınız henüz onaylanmamış. Lütfen sistem yöneticisinin onayını bekleyin.");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    console.log('isPasswordValid:', isPasswordValid, 'for password:', dto.password);
    if (!isPasswordValid) {
      console.log('Login failed: invalid password');
      throw new UnauthorizedException("Geçersiz e-posta veya şifre.");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Pick first tenant as active
    const activeMembership = user.memberships[0];
    if (!activeMembership) {
      throw new NotFoundException("Herhangi bir aileye üye değilsiniz.");
    }

    const tokens = await this.generateTokens(
      user.id,
      activeMembership.tenantId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        activeTenantId: activeMembership.tenantId,
        activeTenantName: activeMembership.tenant.name,
        role: activeMembership.role,
        systemRole: user.systemRole,
        tenants: user.memberships.map((m) => ({
          id: m.tenantId,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.",
      );
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const activeMembership = tokenRecord.user.memberships[0];
    if (!activeMembership) {
      throw new NotFoundException("Herhangi bir aileye üye değilsiniz.");
    }

    const tokens = await this.generateTokens(
      tokenRecord.userId,
      activeMembership.tenantId,
    );

    return {
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        username: tokenRecord.user.username,
        firstName: tokenRecord.user.firstName,
        lastName: tokenRecord.user.lastName,
        activeTenantId: activeMembership.tenantId,
        activeTenantName: activeMembership.tenant.name,
        role: activeMembership.role,
        systemRole: tokenRecord.user.systemRole,
        tenants: tokenRecord.user.memberships.map((m) => ({
          id: m.tenantId,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: "Çıkış başarılı." };
  }

  async switchTenant(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { tenant: true },
    });

    if (!membership || !membership.isActive) {
      throw new UnauthorizedException(
        "Bu aileye erişim yetkiniz bulunmamaktadır.",
      );
    }

    const tokens = await this.generateTokens(userId, tenantId);

    const allMemberships = await this.prisma.tenantMember.findMany({
      where: { userId, isActive: true },
      include: { tenant: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      user: {
        id: user!.id,
        email: user!.email,
        username: user!.username,
        firstName: user!.firstName,
        lastName: user!.lastName,
        activeTenantId: tenantId,
        activeTenantName: membership.tenant.name,
        role: membership.role,
        systemRole: user!.systemRole,
        tenants: allMemberships.map((m) => ({
          id: m.tenantId,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }

  async generateTokens(userId: string, tenantId: string) {
    // Get membership to include role in JWT
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    const payload = {
      sub: userId,
      tenantId,
      role: membership?.role || "MEMBER",
    };

    const accessToken = this.jwtService.sign(payload);

    // Create refresh token
    const refreshTokenValue = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; password?: string; username?: string }) {
    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    
    if (data.username) {
      // Check if username is taken by another user
      const existingUser = await this.prisma.user.findFirst({
        where: { username: data.username, id: { not: userId } }
      });
      if (existingUser) {
        throw new BadRequestException("Bu kullanıcı adı zaten alınmış.");
      }
      updateData.username = data.username;
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
      }
    });
    
    return updatedUser;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return { message: "Eğer sistemde kayıtlıysa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi." };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException("Geçersiz veya süresi dolmuş token.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz." };
  }
}
