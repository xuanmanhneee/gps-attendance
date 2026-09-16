import { PrismaClient, UserRole } from "#prisma/generated/client";

export async function seedUsers(prisma: PrismaClient) {
  const admin = await prisma.user.create({
    data: {
      code: "ADM0001",
      role: UserRole.admin,
      fullname: "Nguyễn Minh Quân",
    },
  });

  const lecturers = await prisma.user.createManyAndReturn({
    data: [
      {
        code: "LEC0001",
        role: UserRole.lecturer,
        fullname: "Trần Quốc Huy",
      },
      {
        code: "LEC0002",
        role: UserRole.lecturer,
        fullname: "Phạm Thị Ngọc Anh",
      },
      {
        code: "LEC0003",
        role: UserRole.lecturer,
        fullname: "Lê Hoàng Nam",
      },
    ],
  });

  const students = await prisma.user.createManyAndReturn({
    data: [
      {
        code: "STU0001",
        role: UserRole.student,
        fullname: "Nguyễn Hoàng Long",
      },
      {
        code: "STU0002",
        role: UserRole.student,
        fullname: "Trần Minh Anh",
      },
      {
        code: "STU0003",
        role: UserRole.student,
        fullname: "Lê Quốc Bảo",
      },
      {
        code: "STU0004",
        role: UserRole.student,
        fullname: "Phạm Ngọc Hà",
      },
      {
        code: "STU0005",
        role: UserRole.student,
        fullname: "Võ Thành Đạt",
      },
      {
        code: "STU0006",
        role: UserRole.student,
        fullname: "Đặng Khánh Linh",
      },
      {
        code: "STU0007",
        role: UserRole.student,
        fullname: "Bùi Gia Huy",
      },
      {
        code: "STU0008",
        role: UserRole.student,
        fullname: "Hoàng Thùy Dương",
      },
      {
        code: "STU0009",
        role: UserRole.student,
        fullname: "Đỗ Minh Khang",
      },
      {
        code: "STU0010",
        role: UserRole.student,
        fullname: "Nguyễn Phương Thảo",
      },
    ],
  });

  return {
    admin,
    lecturers,
    students,
  };
}