import { PrismaClient } from '#prisma/generated/client';

type UserSeed = Awaited<ReturnType<typeof import('./users.seed').seedUsers>>;

export async function seedTags(prisma: PrismaClient, users: UserSeed) {
  const jobFairCntt = await prisma.tag.create({
    data: {
      name: 'jobfair-2026-cntt',
      ownerId: users.organizers[0].id,
    },
  });

  const scholarship = await prisma.tag.create({
    data: {
      name: 'hoc-bong-2026',
      ownerId: users.organizers[1].id,
    },
  });

  const internship = await prisma.tag.create({
    data: {
      name: 'thuc-tap-2026',
      ownerId: users.organizers[2].id,
    },
  });

  const participantGroup = await prisma.tag.create({
    data: {
      name: 'clb-tham-gia',
      ownerId: users.organizers[0].id,
    },
  });

  const event = await prisma.tag.create({
    data: {
      name: 'su-kien-2026',
      ownerId: users.organizers[1].id,
    },
  });

  return {
    jobFairCntt,
    scholarship,
    internship,
    participantGroup,
    event,
  };
}
