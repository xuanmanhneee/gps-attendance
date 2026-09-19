import { PrismaClient, UserRole } from "#prisma/generated/client";

export async function seedUsers(prisma: PrismaClient) {
  const updatedAt = new Date();

  const admin = await prisma.user.create({
    data: {
      code: "ADM0001",
      role: UserRole.admin,
      fullname: "Nguyễn Minh Quân",
      updatedAt,
    },
  });

  const lecturers = await prisma.user.createManyAndReturn({
    data: [
      {
        code: "LEC0001",
        role: UserRole.lecturer,
        fullname: "Trần Quốc Huy",
        updatedAt,
      },
      {
        code: "LEC0002",
        role: UserRole.lecturer,
        fullname: "Phạm Thị Ngọc Anh",
        updatedAt,
      },
      {
        code: "LEC0003",
        role: UserRole.lecturer,
        fullname: "Lê Hoàng Nam",
        updatedAt,
      },
    ],
  });

  const students = await prisma.user.createManyAndReturn({
    data: [
      {
        code: "STU0001",
        role: UserRole.student,
        fullname: "Nguyễn Hoàng Long",
        updatedAt,
      },
      {
        code: "STU0002",
        role: UserRole.student,
        fullname: "Trần Minh Anh",
        updatedAt,
      },
      {
        code: "STU0003",
        role: UserRole.student,
        fullname: "Lê Quốc Bảo",
        updatedAt,
      },
      {
        code: "STU0004",
        role: UserRole.student,
        fullname: "Phạm Ngọc Hà",
        updatedAt,
      },
      {
        code: "STU0005",
        role: UserRole.student,
        fullname: "Võ Thành Đạt",
        updatedAt,
      },
      {
        code: "STU0006",
        role: UserRole.student,
        fullname: "Đặng Khánh Linh",
        updatedAt,
      },
      {
        code: "STU0007",
        role: UserRole.student,
        fullname: "Bùi Gia Huy",
        updatedAt,
      },
      {
        code: "STU0008",
        role: UserRole.student,
        fullname: "Hoàng Thùy Dương",
        updatedAt,
      },
      {
        code: "STU0009",
        role: UserRole.student,
        fullname: "Đỗ Minh Khang",
        updatedAt,
      },
      {
        code: "STU0010",
        role: UserRole.student,
        fullname: "Nguyễn Phương Thảo",
        updatedAt,
      },
    ],
  });

  return {
    admin,
    lecturers,
    students,
  };
}