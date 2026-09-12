import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data for reports...');
  
  // 1. Get the first tenant and user (assuming user already registered)
  const tenant = await prisma.tenant.findFirst();
  const user = await prisma.user.findFirst();

  if (!tenant || !user) {
    console.error('No tenant or user found! Please register first.');
    return;
  }

  const tenantId = tenant.id;
  const userId = user.id;

  // 2. Create Categories
  const expenseCat1 = await prisma.category.create({
    data: { tenantId, name: 'Mutfak & Market', type: 'EXPENSE', icon: 'shopping-cart', color: '#EF4444' }
  });
  const expenseCat2 = await prisma.category.create({
    data: { tenantId, name: 'Faturalar', type: 'EXPENSE', icon: 'zap', color: '#3B82F6' }
  });
  const expenseCat3 = await prisma.category.create({
    data: { tenantId, name: 'Ulaşım', type: 'EXPENSE', icon: 'car', color: '#F59E0B' }
  });
  const incomeCat1 = await prisma.category.create({
    data: { tenantId, name: 'Maaş', type: 'INCOME', icon: 'briefcase', color: '#10B981' }
  });

  // 3. Create Accounts
  const acc1 = await prisma.account.create({
    data: { tenantId, name: 'Garanti Maaş Hesabı', type: 'BANK_ACCOUNT', institution: 'Garanti', currency: 'TRY', initialBalance: 15000, createdBy: userId }
  });
  const acc2 = await prisma.account.create({
    data: { tenantId, name: 'Enpara Kredi Kartı', type: 'CREDIT_CARD', institution: 'QNB', currency: 'TRY', initialBalance: -5000, createdBy: userId }
  });

  // 4. Create Transactions
  const today = new Date();
  
  // Income 1: Salary (5 days ago)
  const date1 = new Date(today);
  date1.setDate(date1.getDate() - 5);
  await prisma.incomeTransaction.create({
    data: {
      tenantId,
      accountId: acc1.id,
      categoryId: incomeCat1.id,
      amount: 45000,
      currency: 'TRY',
      transactionDate: date1,
      description: 'Eylül Maaş',
      createdBy: userId
    }
  });

  // Expense 1: Groceries (4 days ago)
  const date2 = new Date(today);
  date2.setDate(date2.getDate() - 4);
  await prisma.expenseTransaction.create({
    data: {
      tenantId,
      accountId: acc2.id,
      categoryId: expenseCat1.id,
      merchantId: null,
      amount: 3250.50,
      currency: 'TRY',
      transactionDate: date2,
      description: 'Migros Alışveriş',
      paymentMethod: 'CREDIT_CARD',
      createdBy: userId
    }
  });

  // Expense 2: Bills (3 days ago)
  const date3 = new Date(today);
  date3.setDate(date3.getDate() - 3);
  await prisma.expenseTransaction.create({
    data: {
      tenantId,
      accountId: acc1.id,
      categoryId: expenseCat2.id,
      amount: 650,
      currency: 'TRY',
      transactionDate: date3,
      description: 'Elektrik Faturası',
      paymentMethod: 'TRANSFER',
      createdBy: userId
    }
  });

  // Expense 3: Transport (1 day ago)
  const date4 = new Date(today);
  date4.setDate(date4.getDate() - 1);
  await prisma.expenseTransaction.create({
    data: {
      tenantId,
      accountId: acc2.id,
      categoryId: expenseCat3.id,
      amount: 850,
      currency: 'TRY',
      transactionDate: date4,
      description: 'Akaryakıt Shell',
      paymentMethod: 'CREDIT_CARD',
      createdBy: userId
    }
  });

  // Expense 4: Groceries (today)
  await prisma.expenseTransaction.create({
    data: {
      tenantId,
      accountId: acc2.id,
      categoryId: expenseCat1.id,
      amount: 1200,
      currency: 'TRY',
      transactionDate: today,
      description: 'Pazar Alışverişi',
      paymentMethod: 'CASH',
      createdBy: userId
    }
  });

  console.log('Seed data inserted successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
