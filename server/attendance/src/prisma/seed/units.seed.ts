import { PrismaClient } from '#prisma/generated/client';

export async function seedUnits(prisma: PrismaClient) {
  const dalatUniversity = await prisma.unit.create({
    data: {
      name: 'Đại học Đà Lạt',
      parentId: null,
      level: 0,
    },
  });

  const adminUnit = await prisma.unit.create({
    data: {
      name: 'Ban Quản trị',
      parentId: dalatUniversity.id,
      level: 1,
    },
  });

  const cntt = await prisma.unit.create({
    data: {
      name: 'Khoa Công nghệ Thông tin',
      parentId: dalatUniversity.id,
      level: 1,
    },
  });

  const cnttOrganizers = await prisma.unit.create({
    data: {
      name: 'Người tổ chức',
      parentId: cntt.id,
      level: 2,
    },
  });

  const suPham = await prisma.unit.create({
    data: {
      name: 'Khoa Sư phạm',
      parentId: dalatUniversity.id,
      level: 1,
    },
  });

  const suPhamOrganizers = await prisma.unit.create({
    data: {
      name: 'Người tổ chức',
      parentId: suPham.id,
      level: 2,
    },
  });

  const cnttK45 = await prisma.unit.create({
    data: {
      name: 'Khóa K45',
      parentId: cntt.id,
      level: 2,
    },
  });

  const cnttK46 = await prisma.unit.create({
    data: {
      name: 'Khóa K46',
      parentId: cntt.id,
      level: 2,
    },
  });

  const suPhamK45 = await prisma.unit.create({
    data: {
      name: 'Khóa K45',
      parentId: suPham.id,
      level: 2,
    },
  });

  const suPhamK46 = await prisma.unit.create({
    data: {
      name: 'Khóa K46',
      parentId: suPham.id,
      level: 2,
    },
  });

  const [
    cnttK45A,
    cnttK45B,
    cnttK46A,
    cnttK46B,
    suPhamK45A,
    suPhamK45B,
    suPhamK46A,
    suPhamK46B,
  ] = await prisma.$transaction([
    prisma.unit.create({
      data: { name: 'Lớp CTK45A', parentId: cnttK45.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp CTK45B', parentId: cnttK45.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp CTK46A', parentId: cnttK46.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp CTK46B', parentId: cnttK46.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp SPK45A', parentId: suPhamK45.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp SPK45B', parentId: suPhamK45.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp SPK46A', parentId: suPhamK46.id, level: 3 },
    }),
    prisma.unit.create({
      data: { name: 'Lớp SPK46B', parentId: suPhamK46.id, level: 3 },
    }),
  ]);

  return {
    dalatUniversity,
    adminUnit,
    cntt,
    cnttOrganizers,
    suPham,
    suPhamOrganizers,
    cnttK45,
    cnttK46,
    suPhamK45,
    suPhamK46,
    classes: {
      cnttK45A,
      cnttK45B,
      cnttK46A,
      cnttK46B,
      suPhamK45A,
      suPhamK45B,
      suPhamK46A,
      suPhamK46B,
    },
  };
}
