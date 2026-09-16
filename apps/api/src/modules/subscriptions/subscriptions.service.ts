import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePagination } from "../../common/helpers";

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { skip, pageSize, sortOrder } = parsePagination(query);
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nextPaymentDate: "asc" },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return {
      data,
      total,
      page: query.page ? parseInt(query.page) : 1,
      pageSize,
    };
  }

  async create(tenantId: string, userId: string, dto: any) {
    const subscription = await this.prisma.subscription.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
        startDate: new Date(dto.startDate),
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : new Date(dto.startDate),
        reminderEnabled: dto.reminderEnabled ?? true,
        remindBeforeDays: dto.remindBeforeDays ? parseInt(dto.remindBeforeDays) : 3,
      },
    });

    // Hatırlatıcı aktifse otomatik Reminder oluştur
    if (subscription.reminderEnabled && subscription.nextPaymentDate) {
      await this.syncSubscriptionReminder(subscription, userId);
    }

    return subscription;
  }

  async update(id: string, tenantId: string, dto: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Abonelik bulunamadı.");
    
    const dataToUpdate = { ...dto };
    if (dataToUpdate.startDate) dataToUpdate.startDate = new Date(dataToUpdate.startDate);
    if (dataToUpdate.nextPaymentDate) dataToUpdate.nextPaymentDate = new Date(dataToUpdate.nextPaymentDate);
    if (dataToUpdate.remindBeforeDays) dataToUpdate.remindBeforeDays = parseInt(dataToUpdate.remindBeforeDays);
    
    const updated = await this.prisma.subscription.update({ where: { id }, data: dataToUpdate });

    // Hatırlatıcı ayarları değiştiyse senkronize et
    await this.syncSubscriptionReminder(updated, sub.createdBy);

    return updated;
  }

  async remove(id: string, tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!sub) throw new NotFoundException("Abonelik bulunamadı.");

    // İlişkili hatırlatıcıyı da sil
    await this.deleteSubscriptionReminder(id);

    return this.prisma.subscription.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Aboneliğe ait hatırlatıcıyı oluştur, güncelle veya sil.
   * referenceType: 'SUBSCRIPTION', referenceId: subscription.id kullanılarak
   * Reminder tablosuyla ilişkilendirilir.
   */
  private async syncSubscriptionReminder(subscription: any, userId: string) {
    const existing = await this.prisma.reminder.findFirst({
      where: {
        referenceType: 'SUBSCRIPTION',
        referenceId: subscription.id,
        deletedAt: null,
      },
    });

    // Hatırlatıcı kapalıysa veya abonelik aktif değilse → mevcut reminder'ı sil
    if (!subscription.reminderEnabled || subscription.status !== 'ACTIVE') {
      if (existing) {
        await this.prisma.reminder.update({
          where: { id: existing.id },
          data: { deletedAt: new Date(), status: 'CANCELLED' },
        });
        this.logger.log(`Abonelik hatırlatıcısı silindi: ${subscription.name}`);
      }
      return;
    }

    // nextPaymentDate yoksa işlem yapma
    if (!subscription.nextPaymentDate) return;

    // Hatırlatıcı tarihini hesapla: nextPaymentDate - remindBeforeDays
    const reminderDate = new Date(subscription.nextPaymentDate);
    reminderDate.setDate(reminderDate.getDate() - (subscription.remindBeforeDays || 3));

    // Eğer hatırlatıcı tarihi geçmişte kalıyorsa, bugünü kullan
    const now = new Date();
    const effectiveDate = reminderDate < now ? now : reminderDate;

    const reminderData = {
      title: `${subscription.name} abonelik ödemesi`,
      description: `${subscription.name} için ${subscription.amount} ${subscription.currency} tutarında ödeme yaklaşıyor`,
      amount: subscription.amount,
      currency: subscription.currency,
      dueDate: effectiveDate,
      isRecurring: true,
      recurrenceRule: subscription.frequency, // MONTHLY, YEARLY, etc.
      status: 'ACTIVE',
      referenceType: 'SUBSCRIPTION',
      referenceId: subscription.id,
    };

    if (existing) {
      // Mevcut reminder'ı güncelle
      await this.prisma.reminder.update({
        where: { id: existing.id },
        data: reminderData,
      });
      this.logger.log(`Abonelik hatırlatıcısı güncellendi: ${subscription.name}`);
    } else {
      // Yeni reminder oluştur
      await this.prisma.reminder.create({
        data: {
          ...reminderData,
          tenantId: subscription.tenantId,
          createdBy: userId,
        },
      });
      this.logger.log(`Abonelik hatırlatıcısı oluşturuldu: ${subscription.name}`);
    }
  }

  /**
   * Abonelik silindiğinde ilişkili Reminder'ı da soft delete yapar.
   */
  private async deleteSubscriptionReminder(subscriptionId: string) {
    const existing = await this.prisma.reminder.findFirst({
      where: {
        referenceType: 'SUBSCRIPTION',
        referenceId: subscriptionId,
        deletedAt: null,
      },
    });

    if (existing) {
      await this.prisma.reminder.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });
    }
  }
}
