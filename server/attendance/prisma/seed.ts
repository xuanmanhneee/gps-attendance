import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  const env = process.env.NODE_ENV || 'development';
  if (env !== 'development') {
    throw new Error('Prisma seed chỉ được phép chạy với NODE_ENV=development');
  }

  const requiredSeedPassword = (name: string, defaultPassword?: string): string => {
    const value = process.env[name];
    if (value?.trim()) {
      if (value.trim() === 'change-this-in-your-local-env') {
        throw new Error(
          `${name} đang dùng giá trị placeholder; hãy đặt mật khẩu riêng trong server/attendance/.env rồi chạy seed lại.`,
        );
      }
      return value;
    }
    if (defaultPassword !== undefined) return defaultPassword;
    throw new Error(
      `${name} chưa được đặt; hãy cấu hình mật khẩu riêng trong server/attendance/.env rồi chạy seed lại.`,
    );
  };

  const accounts = [
    { id: 1, username: 'admin', password: requiredSeedPassword('SEED_ADMIN_PASSWORD', '123456') },
    { id: 2, username: 'quangtn', password: requiredSeedPassword('SEED_LECTURER_PASSWORD', '123456') },
    { id: 3, username: '2312686', password: '2312686' },
    { id: 4, username: '2312716', password: '2312716' },
    { id: 5, username: '2312718', password: '2312718' },
    { id: 6, username: '2312682', password: '2312682' },
    { id: 7, username: '2312631', password: '2312631' },
  ];

  const users = [
    { id: 1, code: 'ADMIN001', role: Role.admin, fullname: 'Quản trị viên' },
    { id: 2, code: 'GV001', role: Role.organizer, fullname: 'Trần Nhật Quang' },
    { id: 3, code: '2312686', role: Role.participant, fullname: 'Phan Lê Xuân Mạnh' },
    { id: 4, code: '2312716', role: Role.participant, fullname: 'Mai Quý Phước' },
    { id: 5, code: '2312718', role: Role.participant, fullname: 'Phạm Nguyễn Ngọc Phước' },
    { id: 6, code: '2312682', role: Role.participant, fullname: 'Liêng Hót Ha Luyến' },
    { id: 7, code: '2312631', role: Role.participant, fullname: 'Nguyễn Trần Quỳnh Hương' },
  ];

  // BƯỚC 1: Tạo/Cập nhật User trước
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
      create: {
        id: user.id,
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
    });
  }

  // BƯỚC 2: Tạo/Cập nhật Account và nối trực tiếp bằng userId (Unchecked Input)
  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);

    await prisma.account.upsert({
      where: { id: account.id },
      update: {
        username: account.username,
        passwordHash: hashedPassword,
        userId: account.id,
      },
      create: {
        id: account.id,
        username: account.username,
        passwordHash: hashedPassword,
        userId: account.id, // Dùng khóa ngoại userId trực tiếp thay cho user.connect
      },
    });
  }

  await prisma.$queryRaw`
    SELECT setval(
      pg_get_serial_sequence('"users"', 'id'),
      GREATEST(
        COALESCE((SELECT MAX("id") FROM "users"), 0),
        COALESCE(pg_sequence_last_value(pg_get_serial_sequence('"users"', 'id')::regclass), 0),
        1
      ),
      true
    )
  `;
  await prisma.$queryRaw`
    SELECT setval(
      pg_get_serial_sequence('"accounts"', 'id'),
      GREATEST(
        COALESCE((SELECT MAX("id") FROM "accounts"), 0),
        COALESCE(pg_sequence_last_value(pg_get_serial_sequence('"accounts"', 'id')::regclass), 0),
        1
      ),
      true
    )
  `;

  const campus = await prisma.campus.findUnique({
    where: { code: 'DLU' },
    select: { id: true },
  });
  const lecturer = await prisma.user.findUnique({
    where: { code: 'GV001' },
    select: { id: true, role: true },
  });
  const students = await prisma.user.findMany({
    where: {
      code: { in: ['2312686', '2312716', '2312718', '2312682', '2312631'] },
      role: Role.participant,
    },
    select: { id: true },
    orderBy: { code: 'asc' },
  });
  const buildings = campus
    ? await prisma.building.findMany({
        where: { campusId: campus.id, type: 'BUILDING', status: 'ACTIVE' },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
        take: 10,
      })
    : [];

  if (!campus || !lecturer || lecturer.role !== Role.organizer || students.length === 0) {
    throw new Error(
      'Không đủ dữ liệu mẫu: cần campus DLU, giảng viên GV001 và ít nhất một sinh viên seed.',
    );
  }
  if (buildings.length < 10) {
    throw new Error(
      'Cần ít nhất 10 tòa nhà BUILDING đang hoạt động trong campus DLU để seed 10 lớp học phần mẫu.',
    );
  }

  const term = await prisma.academicTerm.upsert({
    where: {
      academicYear_semester: { academicYear: '2026-2027', semester: 1 },
    },
    update: {},
    create: {
      name: 'Học kỳ 1 năm học 2026-2027 (dữ liệu mẫu)',
      academicYear: '2026-2027',
      semester: 1,
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-01-15T00:00:00.000Z'),
    },
  });

  const sampleSections = [
    ['SAMPLE101', 'Lập trình cơ bản', 3],
    ['SAMPLE102', 'Cấu trúc dữ liệu và giải thuật', 3],
    ['SAMPLE103', 'Cơ sở dữ liệu', 3],
    ['SAMPLE104', 'Phân tích và thiết kế hệ thống', 3],
    ['SAMPLE105', 'Mạng máy tính', 3],
    ['SAMPLE106', 'Phát triển ứng dụng web', 3],
    ['SAMPLE107', 'Hệ điều hành', 3],
    ['SAMPLE108', 'Toán rời rạc', 3],
    ['SAMPLE109', 'Nhập môn trí tuệ nhân tạo', 3],
    ['SAMPLE110', 'Kiểm thử phần mềm', 3],
  ] as const;

  for (const [index, [courseCode, courseName, credits]] of sampleSections.entries()) {
    const course = await prisma.course.upsert({
      where: { code: courseCode },
      update: { name: courseName, credits, isActive: true },
      create: { code: courseCode, name: courseName, credits, isActive: true },
    });

    const roomCode = `SAMPLE-R${String(index + 1).padStart(2, '0')}`;
    const building = buildings[index];
    const room = await prisma.room.upsert({
      where: { code: roomCode },
      update: {
        name: `Phòng mẫu ${String(index + 1).padStart(2, '0')}`,
        buildingId: building.id,
        building: building.name,
        floor: '1',
        status: 'ACTIVE',
      },
      create: {
        code: roomCode,
        name: `Phòng mẫu ${String(index + 1).padStart(2, '0')}`,
        buildingId: building.id,
        building: building.name,
        floor: '1',
        status: 'ACTIVE',
      },
    });

    const sectionCode = `${courseCode}-01`;
    const section = await prisma.courseSection.upsert({
      where: { termId_code: { termId: term.id, code: sectionCode } },
      update: {
        courseId: course.id,
        lecturerId: lecturer.id,
        roomId: room.id,
        capacity: 40,
      },
      create: {
        code: sectionCode,
        courseId: course.id,
        termId: term.id,
        lecturerId: lecturer.id,
        roomId: room.id,
        capacity: 40,
      },
    });

    for (const student of students) {
      await prisma.classEnrollment.upsert({
        where: {
          courseSectionId_userId: {
            courseSectionId: section.id,
            userId: student.id,
          },
        },
        update: { status: 'active' },
        create: {
          courseSectionId: section.id,
          userId: student.id,
          status: 'active',
        },
      });
    }

    const dayOfWeek = (index % 5) + 1;
    const startMinute = index < 5 ? 8 * 60 : 13 * 60;
    const endMinute = startMinute + 120;
    const existingSlot = await prisma.timetableSlot.findFirst({
      where: {
        courseSectionId: section.id,
        dayOfWeek,
      },
      select: { id: true },
    });
    if (existingSlot) {
      await prisma.timetableSlot.update({
        where: { id: existingSlot.id },
        data: { startMinute, endMinute, roomId: room.id },
      });
    } else {
      await prisma.timetableSlot.create({
        data: {
          courseSectionId: section.id,
          dayOfWeek,
          startMinute,
          endMinute,
          roomId: room.id,
        },
      });
    }
  }

  console.log('Seeded 10 sample course sections with active student rosters and timetable slots');
  console.log('Seed data ready');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });