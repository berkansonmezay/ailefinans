import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationType } from "@prisma/client";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string, query: any) {
    const unreadOnly = query.unread === "true";
    
    const where: any = { tenantId, userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [data, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit ? parseInt(query.limit) : 50,
      }),
      this.prisma.notification.count({
        where: { tenantId, userId, isRead: false },
      }),
    ]);

    return { data, unreadCount };
  }

  async markAsRead(id: string, tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
      },
    });
  }
}
