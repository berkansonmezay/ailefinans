import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "@prisma/client";

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Run every day at midnight (for testing, we could run every minute but in prod daily)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyChecks() {
    this.logger.log("Daily CRON jobs started.");
    
    await this.checkUpcomingInstallments();
    await this.checkUpcomingSubscriptions();
    await this.checkExpiringWarranties();
    await this.updateWarrantyStatuses();
    await this.checkUpcomingServiceDates();
    
    this.logger.log("Daily CRON jobs completed.");
  }

  private async checkUpcomingInstallments() {
    const today = new Date();
    const inThreeDays = new Date();
    inThreeDays.setDate(today.getDate() + 3);

    const upcoming = await this.prisma.debtInstallment.findMany({
      where: {
        status: "PLANNED",
        dueDate: {
          gte: today,
          lte: inThreeDays,
        },
      },
      include: {
        debt: { include: { tenant: true } },
      },
    });

    for (const inst of upcoming) {
      // Find the tenant owner or admins to notify (MVP: just grab any active member)
      const members = await this.prisma.tenantMember.findMany({
        where: { tenantId: inst.debt.tenantId, isActive: true },
      });

      for (const member of members) {
        await this.notifications.create(
          inst.debt.tenantId,
          member.userId,
          NotificationType.INSTALLMENT_DUE,
          "Yaklaşan Taksit Ödemesi",
          `${inst.debt.creditor} için ${inst.amount} ${inst.debt.currency} tutarındaki taksit ödemenizin tarihi yaklaşıyor.`,
          "DebtInstallment",
          inst.id,
        );
      }
    }
  }

  private async checkUpcomingSubscriptions() {
    const today = new Date();
    const inThreeDays = new Date();
    inThreeDays.setDate(today.getDate() + 3);

    // 1) Yaklaşan abonelikler için bildirim gönder
    const upcoming = await this.prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextPaymentDate: {
          gte: today,
          lte: inThreeDays,
        },
      },
    });

    for (const sub of upcoming) {
      const members = await this.prisma.tenantMember.findMany({
        where: { tenantId: sub.tenantId, isActive: true },
      });

      for (const member of members) {
        await this.notifications.create(
          sub.tenantId,
          member.userId,
          NotificationType.SUBSCRIPTION_RENEWAL,
          "Abonelik Yenilemesi",
          `${sub.name} aboneliğiniz için ${sub.amount} ${sub.currency} tutarında yenileme işlemi yaklaşıyor.`,
          "Subscription",
          sub.id,
        );
      }
    }

    // 2) Ödeme tarihi geçmiş aboneliklerin nextPaymentDate'ini ve hatırlatıcısını ilerlet
    await this.advanceSubscriptionDates();
  }

  /**
   * Ödeme tarihi geçmiş aktif aboneliklerin nextPaymentDate'ini
   * bir sonraki periyoda taşır ve ilişkili Reminder'ı da günceller.
   */
  private async advanceSubscriptionDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        nextPaymentDate: {
          lt: today,
        },
      },
    });

    for (const sub of overdueSubscriptions) {
      const nextDate = new Date(sub.nextPaymentDate!);
      
      switch (sub.frequency) {
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'YEARLY':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Aboneliğin nextPaymentDate'ini güncelle
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { nextPaymentDate: nextDate },
      });

      // İlişkili hatırlatıcının dueDate'ini de güncelle
      if (sub.reminderEnabled) {
        const reminderDate = new Date(nextDate);
        reminderDate.setDate(reminderDate.getDate() - (sub.remindBeforeDays || 3));

        await this.prisma.reminder.updateMany({
          where: {
            referenceType: 'SUBSCRIPTION',
            referenceId: sub.id,
            deletedAt: null,
          },
          data: {
            dueDate: reminderDate,
            status: 'ACTIVE',
          },
        });
      }

      this.logger.log(`Abonelik ileri taşındı: ${sub.name} → ${nextDate.toISOString()}`);
    }
  }

  // ========================
  // WARRANTY CHECKS
  // ========================

  private async checkExpiringWarranties() {
    const today = new Date();

    // reminderEnabled olan ve henüz süresi dolmamış garantileri bul
    const warranties = await this.prisma.warranty.findMany({
      where: {
        deletedAt: null,
        reminderEnabled: true,
        status: { notIn: ["EXPIRED"] },
        warrantyEndDate: { gte: today },
      },
      include: { tenant: true },
    });

    for (const w of warranties) {
      const daysUntilExpiry = Math.ceil(
        (w.warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Hatırlatma gün sayısına yakınsa bildirim gönder
      if (daysUntilExpiry <= w.remindBeforeDays && daysUntilExpiry > 0) {
        const members = await this.prisma.tenantMember.findMany({
          where: { tenantId: w.tenantId, isActive: true },
        });

        for (const member of members) {
          // Aynı garanti için bugün zaten bildirim gönderilmiş mi kontrol et
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const existing = await this.prisma.notification.findFirst({
            where: {
              tenantId: w.tenantId,
              userId: member.userId,
              entityType: "Warranty",
              entityId: w.id,
              createdAt: { gte: todayStart },
            },
          });
          if (existing) continue;

          await this.notifications.create(
            w.tenantId,
            member.userId,
            NotificationType.WARRANTY_EXPIRING,
            "Garanti Süresi Doluyor",
            `${w.productName} (${w.brand || ""}) ürününün garanti süresi ${daysUntilExpiry} gün içinde dolacak.`,
            "Warranty",
            w.id,
          );
        }
      }
    }

    this.logger.log("Garanti süresi kontrolleri tamamlandı.");
  }

  private async updateWarrantyStatuses() {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    // Süresi dolmuş garantileri EXPIRED yap
    const expiredResult = await this.prisma.warranty.updateMany({
      where: {
        deletedAt: null,
        status: { notIn: ["EXPIRED", "CLAIMED"] },
        warrantyEndDate: { lt: today },
      },
      data: { status: "EXPIRED" },
    });

    // 30 gün içinde dolacakları EXPIRING yap
    const expiringResult = await this.prisma.warranty.updateMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        warrantyEndDate: { gte: today, lte: in30Days },
      },
      data: { status: "EXPIRING" },
    });

    if (expiredResult.count > 0 || expiringResult.count > 0) {
      this.logger.log(
        `Garanti durumları güncellendi: ${expiredResult.count} süresi dolmuş, ${expiringResult.count} dolmak üzere`,
      );
    }
  }

  private async checkUpcomingServiceDates() {
    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);

    const upcomingServices = await this.prisma.serviceRecord.findMany({
      where: {
        nextServiceDate: {
          gte: today,
          lte: in7Days,
        },
      },
      include: {
        warranty: { include: { tenant: true } },
      },
    });

    for (const svc of upcomingServices) {
      const members = await this.prisma.tenantMember.findMany({
        where: { tenantId: svc.warranty.tenantId, isActive: true },
      });

      for (const member of members) {
        await this.notifications.create(
          svc.warranty.tenantId,
          member.userId,
          NotificationType.SERVICE_REMINDER,
          "Servis Hatırlatması",
          `${svc.warranty.productName} ürünü için planlanan servis tarihi yaklaşıyor (${svc.serviceProvider}).`,
          "ServiceRecord",
          svc.id,
        );
      }
    }
  }
}
