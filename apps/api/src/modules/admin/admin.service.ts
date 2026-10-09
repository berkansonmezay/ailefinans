import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private authService: AuthService) {}

  async createUser(adminId: string, dto: {
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    password: string;
    tenantName?: string;
    systemRole?: string;
    isActive?: boolean;
  }) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    if (!dto.email || !dto.firstName || !dto.lastName || !dto.password) {
      throw new BadRequestException('Lütfen ad, soyad, e-posta ve şifre alanlarını doldurun.');
    }

    if (dto.password.length < 6) {
      throw new BadRequestException('Şifre en az 6 karakter olmalıdır.');
    }

    const email = dto.email.toLowerCase().trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const username = dto.username?.trim() || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(100 + Math.random() * 900);
    const tenantName = dto.tenantName?.trim() || `${firstName} ${lastName} Ailesi`;
    const systemRole = dto.systemRole === 'ADMIN' ? 'ADMIN' : 'USER';
    const isActive = dto.isActive !== undefined ? Boolean(dto.isActive) : true;

    // Check if email or username already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existing) {
      if (existing.email === email) {
        throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
      }
      throw new ConflictException('Bu kullanıcı adı zaten kullanımda.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          firstName,
          lastName,
          systemRole,
          isActive,
        }
      });

      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
        }
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
        }
      });

      // Seed default expense categories
      const defaultExpenseCategories = [
        "Market", "Fatura", "Ulaşım", "Konut", "Sağlık", "Eğitim",
        "Giyim", "Restoran", "Eğlence", "Tatil", "Teknoloji", "Çocuk",
        "Ev", "Sigorta", "Vergi", "Diğer"
      ];
      for (const cat of defaultExpenseCategories) {
        await tx.category.create({
          data: {
            name: cat,
            type: 'EXPENSE',
            tenantId: tenant.id,
          }
        });
      }

      // Seed default income categories
      const defaultIncomeCategories = [
        "Maaş", "Prim", "Serbest Gelir", "Kira Geliri", "Faiz", "Yatırım Geliri", "Diğer"
      ];
      for (const cat of defaultIncomeCategories) {
        await tx.category.create({
          data: {
            name: cat,
            type: 'INCOME',
            tenantId: tenant.id,
          }
        });
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        systemRole: user.systemRole,
        createdAt: user.createdAt,
        tenantName: tenant.name,
      };
    });
  }

  async getUsers(currentUserId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: currentUserId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        systemRole: true,
        createdAt: true,
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    });

    return users.map(u => ({
      ...u,
      tenantName: u.memberships[0]?.tenant?.name || 'Bilinmiyor'
    }));
  }

  async approveUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });
  }

  async deleteUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Will cascade delete due to foreign keys if setup properly, otherwise might need manual cleanup
    // Currently, Prisma schema uses onDelete: Cascade for most relations to User
    return this.prisma.user.delete({
      where: { id: userId }
    });
  }

  async changeUserPassword(adminId: string, userId: string, newPassword: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  async impersonateUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { tenant: true },
        },
      }
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    
    const activeTenantId = user.memberships.length > 0 ? user.memberships[0].tenant.id : '';

    const tokens = activeTenantId 
      ? await this.authService.generateTokens(user.id, activeTenantId)
      : { accessToken: '', refreshToken: '' }; // Fallback if user has no tenants

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        activeTenantId: activeTenantId,
        activeTenantName: user.memberships.length > 0 ? user.memberships[0].tenant.name : '',
        role: user.memberships.length > 0 ? user.memberships[0].role : 'USER',
        systemRole: user.systemRole,
        tenants: user.memberships.map((m) => ({
          id: m.tenant.id,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }
}
