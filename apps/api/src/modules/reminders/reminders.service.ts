import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private prisma: PrismaService) {}

  async create(createReminderDto: CreateReminderDto, tenantId: string, userId: string) {
    return this.prisma.reminder.create({
      data: {
        ...createReminderDto,
        tenantId,
        createdBy: userId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.reminder.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  async update(id: string, updateReminderDto: UpdateReminderDto, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.reminder.update({
      where: { id },
      data: updateReminderDto,
    });
  }

  async completeReminder(id: string, tenantId: string) {
    const reminder = await this.findOne(id, tenantId);

    if (reminder.isRecurring && reminder.recurrenceRule) {
      // Calculate next due date
      const nextDate = new Date(reminder.dueDate);
      
      switch (reminder.recurrenceRule) {
        case 'DAILY':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'YEARLY':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      return this.prisma.reminder.update({
        where: { id },
        data: {
          dueDate: nextDate,
        },
      });
    } else {
      // One-time reminder
      return this.prisma.reminder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
        },
      });
    }
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.reminder.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'CANCELLED'
      },
    });
  }

  // Runs every day at midnight to generate notifications
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkDueReminders() {
    this.logger.log('Checking for due reminders...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingDate = new Date();
    upcomingDate.setDate(today.getDate() + 3); // Check next 3 days

    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        dueDate: {
          lte: upcomingDate,
        }
      }
    });

    for (const reminder of dueReminders) {
      // Here you could integrate with your actual Notification creation logic
      // e.g. this.prisma.notification.create(...)
      this.logger.log(`Reminder due soon: ${reminder.title} on ${reminder.dueDate}`);
      
      // Let's create an in-app notification if it's due exactly today or overdue
      if (new Date(reminder.dueDate) <= new Date()) {
        await this.prisma.notification.create({
          data: {
            tenantId: reminder.tenantId,
            userId: reminder.createdBy, // Sending to creator for now
            type: 'PAYMENT_REMINDER',
            title: `Hatırlatıcı: ${reminder.title}`,
            message: `${reminder.title} için ödeme zamanı geldi. Tutar: ${reminder.amount || 0} ${reminder.currency}`,
            entityType: 'REMINDER',
            entityId: reminder.id,
            channel: 'IN_APP',
          }
        });
      }
    }
  }
}
