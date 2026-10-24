import bcrypt from 'bcrypt';
import { PrismaClient } from '#prisma/generated/client';

type UserSeed = Awaited<ReturnType<typeof import('./users.seed').seedUsers>>;

export async function seedAccounts(
  prisma: PrismaClient,
  users: UserSeed,
) {
  const updatedAt = new Date();

  await prisma.account.create({
    data: {
      username: 'admin01',
      passwordHash: await bcrypt.hash('admin01', 10),
      userId: users.admin.id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'organizer01',
      passwordHash: await bcrypt.hash('organizer01', 10),
      userId: users.organizers[0].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'organizer02',
      passwordHash: await bcrypt.hash('organizer02', 10),
      userId: users.organizers[1].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'organizer03',
      passwordHash: await bcrypt.hash('organizer03', 10),
      userId: users.organizers[2].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant01',
      passwordHash: await bcrypt.hash('participant01', 10),
      userId: users.participants[0].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant02',
      passwordHash: await bcrypt.hash('participant02', 10),
      userId: users.participants[1].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant03',
      passwordHash: await bcrypt.hash('participant03', 10),
      userId: users.participants[2].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant04',
      passwordHash: await bcrypt.hash('participant04', 10),
      userId: users.participants[3].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant05',
      passwordHash: await bcrypt.hash('participant05', 10),
      userId: users.participants[4].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant06',
      passwordHash: await bcrypt.hash('participant06', 10),
      userId: users.participants[5].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant07',
      passwordHash: await bcrypt.hash('participant07', 10),
      userId: users.participants[6].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant08',
      passwordHash: await bcrypt.hash('participant08', 10),
      userId: users.participants[7].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant09',
      passwordHash: await bcrypt.hash('participant09', 10),
      userId: users.participants[8].id,
      updatedAt,
    },
  });

  await prisma.account.create({
    data: {
      username: 'participant10',
      passwordHash: await bcrypt.hash('participant10', 10),
      userId: users.participants[9].id,
      updatedAt,
    },
  });
}
