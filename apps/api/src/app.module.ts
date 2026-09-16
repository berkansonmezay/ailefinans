import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { MerchantsModule } from "./modules/merchants/merchants.module";
import { IncomesModule } from "./modules/incomes/incomes.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { DebtsModule } from "./modules/debts/debts.module";
import { ReceivablesModule } from "./modules/receivables/receivables.module";
import { SavingsModule } from "./modules/savings/savings.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { WarrantiesModule } from "./modules/warranties/warranties.module";
import { EventsModule } from "./modules/events/events.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CronModule } from './modules/cron/cron.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { AdminModule } from './modules/admin/admin.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { MarketModule } from './modules/market/market.module';
import { SavingsAssetsModule } from './modules/savings-assets/savings-assets.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { CryptoModule } from './modules/crypto/crypto.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantsModule,
    AccountsModule,
    CategoriesModule,
    MerchantsModule,
    IncomesModule,
    ExpensesModule,
    DebtsModule,
    ReceivablesModule,
    SavingsModule,
    SubscriptionsModule,
    InvoicesModule,
    WarrantiesModule,
    EventsModule,
    DashboardModule,
    DocumentsModule,
    NotificationsModule,
    CronModule,
    BudgetsModule,
    AdminModule,
    RemindersModule,
    CalendarModule,
    StocksModule,
    MarketModule,
    SavingsAssetsModule,
    IntegrationsModule,
    CryptoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
