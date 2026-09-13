import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private authService: AuthService) {}

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
