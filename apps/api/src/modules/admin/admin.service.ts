import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(currentUserId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: currentUserId }
    });

    if (!admin || admin.systemRole !== 'ADMIN') {
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

    if (!admin || admin.systemRole !== 'ADMIN') {
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

    if (!admin || admin.systemRole !== 'ADMIN') {
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

    if (!admin || admin.systemRole !== 'ADMIN') {
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
}
