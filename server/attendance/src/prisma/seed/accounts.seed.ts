import bcrypt from 'bcrypt';
import { PrismaClient } from '#prisma/generated/client';

type UserSeed = Awaited<ReturnType<typeof import('./users.seed').seedUsers>>;

export async function seedAccounts(prisma: PrismaClient, users: UserSeed) {
  await prisma.account.create({
    data: {
      username: 'admin01',
      passwordHash: await bcrypt.hash('admin01', 10),
      userId: users.admin.id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'lecturer01',
      passwordHash: await bcrypt.hash('lecturer01', 10),
      userId: users.lecturers[0].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'lecturer02',
      passwordHash: await bcrypt.hash('lecturer02', 10),
      userId: users.lecturers[1].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'lecturer03',
      passwordHash: await bcrypt.hash('lecturer03', 10),
      userId: users.lecturers[2].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student01',
      passwordHash: await bcrypt.hash('student01', 10),
      userId: users.students[0].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student02',
      passwordHash: await bcrypt.hash('student02', 10),
      userId: users.students[1].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student03',
      passwordHash: await bcrypt.hash('student03', 10),
      userId: users.students[2].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student04',
      passwordHash: await bcrypt.hash('student04', 10),
      userId: users.students[3].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student05',
      passwordHash: await bcrypt.hash('student05', 10),
      userId: users.students[4].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student06',
      passwordHash: await bcrypt.hash('student06', 10),
      userId: users.students[5].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student07',
      passwordHash: await bcrypt.hash('student07', 10),
      userId: users.students[6].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student08',
      passwordHash: await bcrypt.hash('student08', 10),
      userId: users.students[7].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student09',
      passwordHash: await bcrypt.hash('student09', 10),
      userId: users.students[8].id,
    },
  });

  await prisma.account.create({
    data: {
      username: 'student10',
      passwordHash: await bcrypt.hash('student10', 10),
      userId: users.students[9].id,
    },
  });
}
