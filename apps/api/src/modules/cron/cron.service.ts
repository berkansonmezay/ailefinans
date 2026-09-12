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
  }
}
