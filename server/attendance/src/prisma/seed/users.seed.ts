import { PrismaClient, Role } from '@prisma/client';

type UnitSeed = Awaited<ReturnType<typeof import('./units.seed').seedUnits>>;

export async function seedUsers(
  prisma: PrismaClient,
  units: UnitSeed,
) {
  const admin = await prisma.user.create({
    data: {
      code: 'ADM0001',
      role: Role.admin,
      fullname: 'Nguyễn Minh Quân',
      unitId: units.adminUnit.id,
    },
  });

  const lecturers = await prisma.user.createManyAndReturn({
    data: [
      {
        code: 'LEC0001',
        role: Role.organizer,
        fullname: 'Trần Quốc Huy',
        unitId: units.cnttOrganizers.id,
      },
      {
        code: 'LEC0002',
        role: Role.organizer,
        fullname: 'Phạm Thị Ngọc Anh',
        unitId: units.cnttOrganizers.id,
      },
      {
        code: 'LEC0003',
        role: Role.organizer,
        fullname: 'Lê Hoàng Nam',
        unitId: units.suPhamOrganizers.id,
      },
    ],
  });

  const students = await prisma.user.createManyAndReturn({
    data: [
      {
        code: 'STU0001',
        role: Role.participant,
        fullname: 'Nguyễn Hoàng Long',
        unitId: units.classes.cnttK45A.id,
      },
      {
        code: 'STU0002',
        role: Role.participant,
        fullname: 'Trần Minh Anh',
        unitId: units.classes.cnttK45A.id,
      },
      {
        code: 'STU0003',
        role: Role.participant,
        fullname: 'Lê Quốc Bảo',
        unitId: units.classes.cnttK45B.id,
      },
      {
        code: 'STU0004',
        role: Role.participant,
        fullname: 'Phạm Ngọc Hà',
        unitId: units.classes.cnttK45B.id,
      },
      {
        code: 'STU0005',
        role: Role.participant,
        fullname: 'Võ Thành Đạt',
        unitId: units.classes.cnttK46A.id,
      },
      {
        code: 'STU0006',
        role: Role.participant,
        fullname: 'Đặng Khánh Linh',
        unitId: units.classes.cnttK46A.id,
      },
      {
        code: 'STU0007',
        role: Role.participant,
        fullname: 'Bùi Gia Huy',
        unitId: units.classes.cnttK46B.id,
      },
      {
        code: 'STU0008',
        role: Role.participant,
        fullname: 'Hoàng Thùy Dương',
        unitId: units.classes.suPhamK45A.id,
      },
      {
        code: 'STU0009',
        role: Role.participant,
        fullname: 'Đỗ Minh Khang',
        unitId: units.classes.suPhamK45B.id,
      },
      {
        code: 'STU0010',
        role: Role.participant,
        fullname: 'Nguyễn Phương Thảo',
        unitId: units.classes.suPhamK46A.id,
      },
    ],
  });

  return {
    admin,
    lecturers,
    students,
  };
}