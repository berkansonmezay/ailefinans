// === Enums ===
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum AccountType {
  CASH = 'CASH',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  CREDIT_CARD = 'CREDIT_CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  INVESTMENT = 'INVESTMENT',
  FOREIGN_CURRENCY = 'FOREIGN_CURRENCY',
  GOLD = 'GOLD',
  OTHER = 'OTHER',
}

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum DebtStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum InstallmentStatus {
  PLANNED = 'PLANNED',
  DUE_SOON = 'DUE_SOON',
  DUE = 'DUE',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum ReceivableStatus {
  OPEN = 'OPEN',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum SavingsType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum SavingsStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  INSTALLMENT_DUE = 'INSTALLMENT_DUE',
  INSTALLMENT_OVERDUE = 'INSTALLMENT_OVERDUE',
  RECEIVABLE_DUE = 'RECEIVABLE_DUE',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
  INVOICE_DUE = 'INVOICE_DUE',
  WARRANTY_EXPIRING = 'WARRANTY_EXPIRING',
  EVENT_REMINDER = 'EVENT_REMINDER',
  SAVINGS_REMINDER = 'SAVINGS_REMINDER',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WEB_PUSH = 'WEB_PUSH',
}

// === API Response Types ===
export interface ApiError {
  code: string;
  field?: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: ApiError[];
  meta?: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// === Auth DTOs ===
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  activeTenantId: string | null;
  activeTenantName: string | null;
  role: Role | null;
  tenants: TenantSummary[];
}

export interface TenantSummary {
  id: string;
  name: string;
  role: Role;
}

// === Dashboard KPIs ===
export interface DashboardKPIs {
  totalIncome: string;
  totalExpense: string;
  netCashFlow: string;
  totalDebt: string;
  upcomingInstallments: number;
  totalReceivable: string;
  monthlySavings: string;
  totalSavings: string;
  monthlySubscriptionCost: string;
  upcomingInvoices: number;
  upcomingWarrantyExpiries: number;
  upcomingEvents: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
}
