import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Prisma seed chỉ được phép chạy với NODE_ENV=development');
  }

  const requiredSeedPassword = (name: string): string => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Thiếu biến môi trường ${name} cho seed development`);
    }
    return value;
  };

  const accounts = [
    { id: 1, username: 'admin', password: requiredSeedPassword('SEED_ADMIN_PASSWORD') },
    { id: 2, username: 'quangtn', password: requiredSeedPassword('SEED_LECTURER_PASSWORD') },
    { id: 3, username: '2312686', password: requiredSeedPassword('SEED_STUDENT_1_PASSWORD') },
    { id: 4, username: '2312716', password: requiredSeedPassword('SEED_STUDENT_2_PASSWORD') },
    { id: 5, username: '2312718', password: requiredSeedPassword('SEED_STUDENT_3_PASSWORD') },
    { id: 6, username: '2312682', password: requiredSeedPassword('SEED_STUDENT_4_PASSWORD') },
    { id: 7, username: '2312631', password: requiredSeedPassword('SEED_STUDENT_5_PASSWORD') },
  ];

  const users = [
    { id: 1, accountId: 1, code: 'ADMIN001', role: Role.admin, fullname: 'Quản trị viên' },
    { id: 2, accountId: 2, code: 'GV001', role: Role.lecturer, fullname: 'Trần Nhật Quang' },
    { id: 3, accountId: 3, code: '2312686', role: Role.student, fullname: 'Phan Lê Xuân Mạnh' },
    { id: 4, accountId: 4, code: '2312716', role: Role.student, fullname: 'Mai Quý Phước' },
    { id: 5, accountId: 5, code: '2312718', role: Role.student, fullname: 'Phạm Nguyễn Ngọc Phước' },
    { id: 6, accountId: 6, code: '2312682', role: Role.student, fullname: 'Liêng Hót Ha Luyến' },
    { id: 7, accountId: 7, code: '2312631', role: Role.student, fullname: 'Nguyễn Trần Quỳnh Hương' },
  ];

  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    await prisma.account.upsert({
      where: { id: account.id },
      update: { username: account.username, password: hashedPassword },
      create: {
        id: account.id,
        username: account.username,
        password: hashedPassword,
      },
    });
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        accountId: user.accountId,
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
      create: {
        id: user.id,
        accountId: user.accountId,
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
    });
  }

  console.log('Seed data ready');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
