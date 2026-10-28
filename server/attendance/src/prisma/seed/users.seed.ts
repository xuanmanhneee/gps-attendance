import { PrismaClient, UserRole } from '#prisma/generated/client';

type UnitSeed = Awaited<ReturnType<typeof import('./units.seed').seedUnits>>;

export async function seedUsers(prisma: PrismaClient, units: UnitSeed) {
  const admin = await prisma.user.create({
    data: {
      code: 'ADM0001',
      role: UserRole.admin,
      fullname: 'Nguyễn Minh Quân',
      unitId: units.adminUnit.id,
    },
  });

  const organizers = await prisma.user.createManyAndReturn({
    data: [
      {
        code: 'ORG0001',
        role: UserRole.organizer,
        fullname: 'Trần Quốc Huy',
        unitId: units.cnttOrganizers.id,
      },
      {
        code: 'ORG0002',
        role: UserRole.organizer,
        fullname: 'Phạm Thị Ngọc Anh',
        unitId: units.cnttOrganizers.id,
      },
      {
        code: 'ORG0003',
        role: UserRole.organizer,
        fullname: 'Lê Hoàng Nam',
        unitId: units.suPhamOrganizers.id,
      },
    ],
  });

  const participants = await prisma.user.createManyAndReturn({
    data: [
      {
        code: 'PAR0001',
        role: UserRole.participant,
        fullname: 'Nguyễn Hoàng Long',
        unitId: units.classes.cnttK45A.id,
      },
      {
        code: 'PAR0002',
        role: UserRole.participant,
        fullname: 'Trần Minh Anh',
        unitId: units.classes.cnttK45A.id,
      },
      {
        code: 'PAR0003',
        role: UserRole.participant,
        fullname: 'Lê Quốc Bảo',
        unitId: units.classes.cnttK45B.id,
      },
      {
        code: 'PAR0004',
        role: UserRole.participant,
        fullname: 'Phạm Ngọc Hà',
        unitId: units.classes.cnttK45B.id,
      },
      {
        code: 'PAR0005',
        role: UserRole.participant,
        fullname: 'Võ Thành Đạt',
        unitId: units.classes.cnttK46A.id,
      },
      {
        code: 'PAR0006',
        role: UserRole.participant,
        fullname: 'Đặng Khánh Linh',
        unitId: units.classes.cnttK46A.id,
      },
      {
        code: 'PAR0007',
        role: UserRole.participant,
        fullname: 'Bùi Gia Huy',
        unitId: units.classes.cnttK46B.id,
      },
      {
        code: 'PAR0008',
        role: UserRole.participant,
        fullname: 'Hoàng Thùy Dương',
        unitId: units.classes.cnttK46B.id,
      },
      {
        code: 'PAR0009',
        role: UserRole.participant,
        fullname: 'Đỗ Minh Khang',
        unitId: units.classes.suPhamK45A.id,
      },
      {
        code: 'PAR0010',
        role: UserRole.participant,
        fullname: 'Nguyễn Phương Thảo',
        unitId: units.classes.suPhamK45B.id,
      },
    ],
  });

  return {
    admin,
    organizers,
    participants,
  };
}
