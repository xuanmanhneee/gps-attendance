import { PrismaClient } from '#prisma/generated/client';

type UserSeed = Awaited<ReturnType<typeof import('./users.seed').seedUsers>>;

export async function seedTags(prisma: PrismaClient, users: UserSeed) {
  const jobFairCntt = await prisma.tag.create({
    data: {
      name: 'jobfair-2026-cntt',
      ownerId: users.lecturers[0].id,
    },
  });

  const jobFairKinhTe = await prisma.tag.create({
    data: {
      name: 'jobfair-2026-kinh-te',
      ownerId: users.lecturers[1].id,
    },
  });

  const jobFairDoanhNghiep = await prisma.tag.create({
    data: {
      name: 'jobfair-2026-doanh-nghiep',
      ownerId: users.lecturers[2].id,
    },
  });

  return {
    jobFairCntt,
    jobFairKinhTe,
    jobFairDoanhNghiep,
  };
}
