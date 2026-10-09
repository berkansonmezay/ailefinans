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
    existingTenantId?: string;
    tenantRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
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

      // Mevcut bir aileye mi dahil ediliyor, yoksa yeni aile hesabı mı açılıyor?
      if (dto.existingTenantId) {
        const existingTenant = await tx.tenant.findUnique({
          where: { id: dto.existingTenantId }
        });

        if (!existingTenant) {
          throw new NotFoundException('Seçilen aile hesabı bulunamadı.');
        }

        const role = dto.tenantRole || 'MEMBER';

        await tx.tenantMember.create({
          data: {
            tenantId: existingTenant.id,
            userId: user.id,
            role: role as any,
          }
        });

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          isActive: user.isActive,
          systemRole: user.systemRole,
          createdAt: user.createdAt,
          tenantId: existingTenant.id,
          tenantName: existingTenant.name,
          tenantRole: role,
        };
      }

      // Yeni aile hesabı açılıyor
      const tenantName = dto.tenantName?.trim() || `${firstName} ${lastName} Ailesi`;
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

      // Seed default expense categories (1 sample category)
      const defaultExpenseCategories = ["Genel Gider"];
      for (const cat of defaultExpenseCategories) {
        await tx.category.create({
          data: {
            name: cat,
            type: 'EXPENSE',
            tenantId: tenant.id,
          }
        });
      }

      // Seed default income categories (1 sample category)
      const defaultIncomeCategories = ["Maaş"];
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
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantRole: 'OWNER',
      };
    });
  }

  async getTenants(currentUserId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: currentUserId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true,
                isActive: true,
                systemRole: true,
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        _count: {
          select: {
            members: true,
            accounts: true,
            incomes: true,
            expenses: true,
            debts: true,
            receivables: true,
          }
        }
      }
    });

    return tenants.map(t => {
      const ownerMember = t.members.find(m => m.role === 'OWNER') || t.members[0];
      return {
        id: t.id,
        name: t.name,
        currency: t.currency,
        isActive: t.isActive,
        createdAt: t.createdAt,
        owner: ownerMember ? {
          id: ownerMember.user.id,
          fullName: `${ownerMember.user.firstName} ${ownerMember.user.lastName}`,
          email: ownerMember.user.email,
          username: ownerMember.user.username,
        } : null,
        members: t.members.map(m => ({
          id: m.id,
          userId: m.user.id,
          fullName: `${m.user.firstName} ${m.user.lastName}`,
          email: m.user.email,
          username: m.user.username,
          role: m.role,
          isActive: m.isActive,
          joinedAt: m.joinedAt,
        })),
        stats: {
          memberCount: t._count.members,
          accountCount: t._count.accounts,
          transactionCount: t._count.incomes + t._count.expenses,
          debtCount: t._count.debts + t._count.receivables,
        }
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
        username: true,
        avatarUrl: true,
        isActive: true,
        systemRole: true,
        disabledMenus: true,
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
      tenantId: u.memberships[0]?.tenant?.id || null,
      tenantName: u.memberships[0]?.tenant?.name || 'Bilinmiyor',
      tenantRole: u.memberships[0]?.role || 'MEMBER',
    }));
  }

  async updateUser(adminId: string, userId: string, dto: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    systemRole?: string;
    isActive?: boolean;
    tenantName?: string;
    existingTenantId?: string;
    tenantRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  }) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.systemRole)) {
      throw new UnauthorizedException('Bu işlemi yapmaya yetkiniz yok.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { tenant: true }
        }
      }
    });

    if (!targetUser) throw new NotFoundException('Kullanıcı bulunamadı.');

    // E-posta çakışma kontrolü
    if (dto.email && dto.email !== targetUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email }
      });
      if (emailExists) {
        throw new ConflictException('Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.');
      }
    }

    // Kullanıcı adı çakışma kontrolü
    const cleanUsername = dto.username ? dto.username.replace(/^@/, '').trim().toLowerCase() : null;
    if (cleanUsername && cleanUsername !== targetUser.username) {
      const usernameExists = await this.prisma.user.findUnique({
        where: { username: cleanUsername }
      });
      if (usernameExists) {
        throw new ConflictException('Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor.');
      }
    }

    // Rol güvenlik kontrolü
    let newSystemRole = targetUser.systemRole;
    if (dto.systemRole && dto.systemRole !== targetUser.systemRole) {
      if (admin.systemRole !== 'SUPER_ADMIN' && (dto.systemRole === 'SUPER_ADMIN' || targetUser.systemRole === 'SUPER_ADMIN')) {
        throw new UnauthorizedException('Kurucu (SUPER_ADMIN) rolünü yalnızca bir Kurucu değiştirebilir.');
      }
      newSystemRole = dto.systemRole;
    }

    const primaryMembership = targetUser.memberships[0];

    return this.prisma.$transaction(async (tx) => {
      // 1. Aile Değişimi veya Rol Değişimi
      if (dto.existingTenantId && dto.existingTenantId !== primaryMembership?.tenantId) {
        const newTenant = await tx.tenant.findUnique({ where: { id: dto.existingTenantId } });
        if (!newTenant) {
          throw new NotFoundException('Seçilen yeni aile hesabı bulunamadı.');
        }

        if (primaryMembership) {
          await tx.tenantMember.update({
            where: { id: primaryMembership.id },
            data: {
              tenantId: dto.existingTenantId,
              role: (dto.tenantRole as any) || primaryMembership.role,
            }
          });
        } else {
          await tx.tenantMember.create({
            data: {
              tenantId: dto.existingTenantId,
              userId: targetUser.id,
              role: (dto.tenantRole as any) || 'MEMBER',
            }
          });
        }
      } else if (dto.tenantRole && primaryMembership && dto.tenantRole !== primaryMembership.role) {
        await tx.tenantMember.update({
          where: { id: primaryMembership.id },
          data: { role: dto.tenantRole as any }
        });
      }

      // 2. Aile Adı Güncellemesi (eğer aile değiştirilmediyse ve ad verildiyse)
      if (!dto.existingTenantId && dto.tenantName && dto.tenantName.trim()) {
        if (primaryMembership?.tenantId) {
          await tx.tenant.update({
            where: { id: primaryMembership.tenantId },
            data: { name: dto.tenantName.trim() }
          });
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName !== undefined ? dto.firstName.trim() : targetUser.firstName,
          lastName: dto.lastName !== undefined ? dto.lastName.trim() : targetUser.lastName,
          email: dto.email !== undefined ? dto.email.trim() : targetUser.email,
          username: cleanUsername !== null ? cleanUsername : targetUser.username,
          systemRole: newSystemRole,
          isActive: dto.isActive !== undefined ? dto.isActive : targetUser.isActive,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          isActive: true,
          systemRole: true,
          disabledMenus: true,
          createdAt: true,
          memberships: {
            include: {
              tenant: true
            }
          }
        }
      });

      return {
        ...updatedUser,
        tenantId: updatedUser.memberships[0]?.tenant?.id || null,
        tenantName: updatedUser.memberships[0]?.tenant?.name || 'Bilinmiyor',
        tenantRole: updatedUser.memberships[0]?.role || 'MEMBER',
      };
    });
  }

  async updateUserMenus(adminId: string, userId: string, disabledMenus: string[]) {
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
      data: { disabledMenus },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        disabledMenus: true,
      }
    });
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
