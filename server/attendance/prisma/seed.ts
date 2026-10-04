import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  const env = process.env.NODE_ENV || 'development';
  if (env !== 'development') {
    throw new Error('Prisma seed chỉ được phép chạy với NODE_ENV=development');
  }

  const requiredSeedPassword = (name: string, defaultPassword = 'Password@123456'): string => {
    const value = process.env[name];
    if (value) return value;
    return defaultPassword;
  };

  const accounts = [
    { id: 1, username: 'admin', password: requiredSeedPassword('SEED_ADMIN_PASSWORD') },
    { id: 2, username: 'quangtn', password: requiredSeedPassword('SEED_LECTURER_PASSWORD') },
    { id: 3, username: '2312686', password: requiredSeedPassword('SEED_STUDENT_1_PASSWORD', '123456') },
    { id: 4, username: '2312716', password: requiredSeedPassword('SEED_STUDENT_2_PASSWORD', '123456') },
    { id: 5, username: '2312718', password: requiredSeedPassword('SEED_STUDENT_3_PASSWORD', '123456') },
    { id: 6, username: '2312682', password: requiredSeedPassword('SEED_STUDENT_4_PASSWORD', '123456') },
    { id: 7, username: '2312631', password: requiredSeedPassword('SEED_STUDENT_5_PASSWORD', '123456') },
  ];

  const users = [
    { id: 1, code: 'ADMIN001', role: Role.admin, fullname: 'Quản trị viên' },
    { id: 2, code: 'GV001', role: Role.lecturer, fullname: 'Trần Nhật Quang' },
    { id: 3, code: '2312686', role: Role.student, fullname: 'Phan Lê Xuân Mạnh' },
    { id: 4, code: '2312716', role: Role.student, fullname: 'Mai Quý Phước' },
    { id: 5, code: '2312718', role: Role.student, fullname: 'Phạm Nguyễn Ngọc Phước' },
    { id: 6, code: '2312682', role: Role.student, fullname: 'Liêng Hót Ha Luyến' },
    { id: 7, code: '2312631', role: Role.student, fullname: 'Nguyễn Trần Quỳnh Hương' },
  ];

  // BƯỚC 1: Tạo/Cập nhật User trước
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
      create: {
        id: user.id,
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
    });
  }

  // BƯỚC 2: Tạo/Cập nhật Account và nối trực tiếp bằng userId (Unchecked Input)
  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);

    await prisma.account.upsert({
      where: { id: account.id },
      update: {
        username: account.username,
        passwordHash: hashedPassword,
        userId: account.id,
      },
      create: {
        id: account.id,
        username: account.username,
        passwordHash: hashedPassword,
        userId: account.id, // Dùng khóa ngoại userId trực tiếp thay cho user.connect
      },
    });
  }

  console.log('Seed data ready');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });