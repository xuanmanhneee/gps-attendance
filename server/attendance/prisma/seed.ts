import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  const accounts = [
    { id: 1, username: 'admin', password: 'admin' },
    { id: 2, username: 'quangtn', password: 'quangtn' },
    { id: 3, username: '2312686', password: '2312686' },
    { id: 4, username: '2312716', password: '2312716' },
    { id: 5, username: '2312718', password: '2312718' },
    { id: 6, username: '2312682', password: '2312682' },
    { id: 7, username: '2312631', password: '2312631' },
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
