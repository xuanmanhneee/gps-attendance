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

  const lecturers = await prisma.user.createManyAndReturn({
    data: [
      {
        code: 'LEC0001',
        role: UserRole.lecturer,
        fullname: 'Trần Quốc Huy',
        unitId: units.cnttLecturers.id,
      },
      {
        code: 'LEC0002',
        role: UserRole.lecturer,
        fullname: 'Phạm Thị Ngọc Anh',
        unitId: units.cnttLecturers.id,
      },
      {
        code: 'LEC0003',
        role: UserRole.lecturer,
        fullname: 'Lê Hoàng Nam',
        unitId: units.suPhamLecturers.id,
      },
    ],
  });

  const students = await prisma.user.createManyAndReturn({
    data: [
      {
        code: 'STU0001',
        role: UserRole.student,
        fullname: 'Nguyễn Hoàng Long',
        unitId: units.classes.cnttK45A.id,
      },
      {
        code: 'STU0002',
        role: UserRole.student,
        fullname: 'Trần Minh Anh',
        unitId: units.classes.cnttK45A.id,
      },
      {
        code: 'STU0003',
        role: UserRole.student,
        fullname: 'Lê Quốc Bảo',
        unitId: units.classes.cnttK45B.id,
      },
      {
        code: 'STU0004',
        role: UserRole.student,
        fullname: 'Phạm Ngọc Hà',
        unitId: units.classes.cnttK45B.id,
      },
      {
        code: 'STU0005',
        role: UserRole.student,
        fullname: 'Võ Thành Đạt',
        unitId: units.classes.cnttK46A.id,
      },
      {
        code: 'STU0006',
        role: UserRole.student,
        fullname: 'Đặng Khánh Linh',
        unitId: units.classes.cnttK46A.id,
      },
      {
        code: 'STU0007',
        role: UserRole.student,
        fullname: 'Bùi Gia Huy',
        unitId: units.classes.cnttK46B.id,
      },
      {
        code: 'STU0008',
        role: UserRole.student,
        fullname: 'Hoàng Thùy Dương',
        unitId: units.classes.suPhamK45A.id,
      },
      {
        code: 'STU0009',
        role: UserRole.student,
        fullname: 'Đỗ Minh Khang',
        unitId: units.classes.suPhamK45B.id,
      },
      {
        code: 'STU0010',
        role: UserRole.student,
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
