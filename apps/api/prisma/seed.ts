import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Veritabanına varsayılan veriler ekleniyor...');

  // 1. Önce eski verileri temizle (opsiyonel, dikkatli kullanın)
  // await prisma.tenantMember.deleteMany();
  // await prisma.tenant.deleteMany();
  // await prisma.user.deleteMany();

  // 2. Varsayılan kullanıcıyı oluştur
  const passwordHash = await bcrypt.hash('123456', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@ailefinans.com' },
    update: {
      username: 'admin',
      isActive: true,
      passwordHash,
      systemRole: 'SUPER_ADMIN',
    },
    create: {
      email: 'admin@ailefinans.com',
      username: 'admin',
      isActive: true,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Kullanıcı',
      systemRole: 'SUPER_ADMIN',
    },
  });

  // 3. Varsayılan aileyi (Tenant) oluştur
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-id' }, // Sabit bir ID vermek için ama Prisma genelde uuid kullanır
    update: {},
    create: {
      name: 'Demo Ailesi',
      currency: 'TRY',
    },
  });

  // 4. Kullanıcıyı aileye bağla (Owner rolünde)
  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // 5. Varsayılan kategorileri ekle (Eğer yoksa)
  const categories = [
    { name: 'Market', type: 'EXPENSE' },
    { name: 'Fatura', type: 'EXPENSE' },
    { name: 'Kira', type: 'EXPENSE' },
    { name: 'Maaş', type: 'INCOME' },
  ];

  for (const cat of categories) {
    const existingCat = await prisma.category.findFirst({
      where: { name: cat.name, tenantId: tenant.id },
    });
    
    if (!existingCat) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type as any,
          tenantId: tenant.id,
          isSystem: true,
        },
      });
    }
  }

  console.log('✅ Demo kullanıcı oluşturuldu!');
  console.log('-------------------------------------------');
  console.log('Giriş Bilgileri:');
  console.log('E-posta: admin@ailefinans.com');
  console.log('Şifre:   123456');
  console.log('-------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
