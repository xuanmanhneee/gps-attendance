import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { ImportSectionStudentDto } from './dto/import-section-roster.dto';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UsersService } from '../users/users.service';
import { AttendanceSession } from './attendance-session.model';
import { AttendanceRecord } from '../attendance-record/attendance-record.model';
import { User } from '../users/user.model';
import {
  AttendanceSessionResponse,
  AttendanceSessionDetailResponse,
  AttendanceAttemptDto,
  AttendanceHistoryEventDto,
  AttendanceReviewDecision,
  LecturerAttendanceAnalytics,
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
import { PrismaService } from '../common/database/prisma.service';
import { GeoService } from '../geo/geo.service';

@Injectable()
export class AttendanceSessionQueryService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly geoService?: GeoService,
  ) {}

  async getTeachingSections(lecturerId: number, isAdmin = false) {
    const sections = await this.prisma.courseSection.findMany({
      where: {
        ...(isAdmin ? {} : { lecturerId }),
        course: { isActive: true },
      },
      include: {
        course: { select: { code: true, name: true } },
        term: {
          select: {
            name: true,
            academicYear: true,
            semester: true,
            startDate: true,
            endDate: true,
          },
        },
        room: { include: { registryBuilding: true } },
        timetable: {
          orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
          include: { room: { include: { registryBuilding: true } } },
        },
        enrollments: {
          where: { status: 'active' },
          select: { userId: true },
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    const toRoom = (room: (typeof sections)[number]['room']) =>
      room
        ? {
            id: room.id,
            code: room.code,
            name: room.name,
            floor: room.floor,
            status: room.status,
            building: room.registryBuilding
              ? {
                  id: room.registryBuilding.id,
                  code: room.registryBuilding.code,
                  name: room.registryBuilding.name,
                  type: room.registryBuilding.type,
                  status: room.registryBuilding.status,
                  verified: room.registryBuilding.verified,
                  latitude: Number(room.registryBuilding.latitude),
                  longitude: Number(room.registryBuilding.longitude),
                  geofenceRadius:
                    room.registryBuilding.geofenceRadius === null
                      ? null
                      : Number(room.registryBuilding.geofenceRadius),
                  gpsAccuracyThreshold:
                    room.registryBuilding.gpsAccuracyThreshold === null
                      ? null
                      : Number(room.registryBuilding.gpsAccuracyThreshold),
                }
              : null,
          }
        : null;

    return sections.map((section) => ({
      id: section.id,
      code: section.code,
      course: section.course,
      term: section.term,
      room: toRoom(section.room),
      activeEnrollmentCount: section.enrollments.length,
      timetable: section.timetable.map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        scheduledDate: slot.scheduledDate?.toISOString().slice(0, 10) ?? null,
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        room: toRoom(slot.room),
      })),
    }));
  }

  async getCourseSectionCreationOptions() {
    const [lecturers, rooms, courses] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'organizer' },
        select: { id: true, code: true, fullname: true },
        orderBy: { fullname: 'asc' },
      }),
      this.prisma.room.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.course.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, credits: true },
        orderBy: { code: 'asc' },
      }),
    ]);
    return { lecturers, rooms, courses };
  }

  async importCourses(input: Array<{ code: string; name?: string; credits?: number }>) {
    const seen = new Set<string>();
    const duplicateCodes: string[] = [];
    const uniqueCourses: Array<{ code: string; name: string; credits?: number }> = [];
    for (const item of input) {
      const code = item.code.trim();
      if (!code) continue;
      if (seen.has(code)) {
        duplicateCodes.push(code);
        continue;
      }
      seen.add(code);
      uniqueCourses.push({
        code,
        name: item.name?.trim() || code,
        ...(item.credits !== undefined ? { credits: item.credits } : {}),
      });
    }
    if (uniqueCourses.length === 0) {
      throw new BadRequestException('Danh sách không có mã học phần hợp lệ.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.course.findMany({
        where: { code: { in: uniqueCourses.map((course) => course.code) } },
        select: { code: true },
      });
      const existingCodes = new Set(existing.map((course) => course.code));
      const newCourses = uniqueCourses.filter((course) => !existingCodes.has(course.code));

      if (newCourses.length > 0) {
        await transaction.course.createMany({
          data: newCourses.map((course) => ({
            ...course,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }

      return {
        createdCodes: newCourses.map((course) => course.code),
        existingCodes: uniqueCourses
          .filter((course) => existingCodes.has(course.code))
          .map((course) => course.code),
        duplicateCodes,
      };
    });
  }

  async createCourseSection(input: {
    courseCode: string;
    courseName: string;
    sectionCode: string;
    credits?: number;
    academicYear: string;
    semester: number;
    termName: string;
    startDate: string;
    endDate: string;
    lecturerId?: number;
    roomId?: number;
    capacity?: number;
  }) {
    const courseCode = input.courseCode.trim();
    const courseName = input.courseName.trim();
    const sectionCode = input.sectionCode.trim();
    const academicYear = input.academicYear.trim();
    const termName = input.termName.trim();
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('Ngày kết thúc học kỳ phải sau ngày bắt đầu.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existingCourse = await transaction.course.findUnique({
          where: { code: courseCode },
        });
        if (existingCourse && !existingCourse.isActive) {
          throw new ConflictException('Mã học phần này thuộc môn học đã ngừng hoạt động.');
        }
        const course = existingCourse ?? await transaction.course.create({
          data: {
            code: courseCode,
            name: courseName,
            credits: input.credits,
          },
        });

        const term = await transaction.academicTerm.upsert({
          where: {
            academicYear_semester: { academicYear, semester: input.semester },
          },
          update: {},
          create: {
            name: termName,
            academicYear,
            semester: input.semester,
            startDate,
            endDate,
          },
        });

        if (input.lecturerId !== undefined) {
          const lecturer = await transaction.user.findUnique({
            where: { id: input.lecturerId },
            select: { role: true },
          });
          if (!lecturer || lecturer.role !== 'organizer') {
            throw new BadRequestException('Giảng viên được chọn không hợp lệ.');
          }
        }
        if (input.roomId !== undefined) {
          const room = await transaction.room.findUnique({
            where: { id: input.roomId },
            select: { status: true },
          });
          if (!room || room.status !== 'ACTIVE') {
            throw new BadRequestException('Phòng học được chọn không hợp lệ hoặc đã ngừng sử dụng.');
          }
        }

        const existingSection = await transaction.courseSection.findUnique({
          where: { termId_code: { termId: term.id, code: sectionCode } },
          select: { id: true },
        });
        if (existingSection) {
          throw new ConflictException('Mã lớp học phần đã tồn tại trong học kỳ này.');
        }

        return transaction.courseSection.create({
          data: {
            code: sectionCode,
            courseId: course.id,
            termId: term.id,
            lecturerId: input.lecturerId,
            roomId: input.roomId,
            capacity: input.capacity,
          },
          include: {
            course: { select: { code: true, name: true } },
            term: { select: { name: true, academicYear: true, semester: true } },
            lecturer: { select: { id: true, fullname: true } },
            room: { select: { id: true, code: true, name: true } },
          },
        });
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Mã lớp học phần đã tồn tại trong học kỳ này.');
      }
      throw error;
    }
  }

  async getSectionRoster(
    sectionId: number,
    user?: { userId: number; role: string },
  ) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        code: true,
        capacity: true,
        lecturerId: true,
        course: { select: { code: true, name: true } },
        term: { select: { name: true, academicYear: true, semester: true } },
      },
    });
    if (!section) {
      throw new NotFoundException('Không tìm thấy lớp học phần.');
    }
    if (
      user &&
      user.role !== 'admin' &&
      section.lecturerId !== user.userId
    ) {
      throw new ForbiddenException('Bạn không được phân công giảng dạy lớp học phần này.');
    }

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { courseSectionId: sectionId, status: 'active' },
      include: {
        user: {
          select: {
            id: true,
            code: true,
            fullname: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            cohort: true,
          },
        },
      },
      orderBy: { user: { code: 'asc' } },
    });

    return {
      section,
      students: enrollments.map(({ user, enrolledAt }) => ({
        id: user.id,
        code: user.code,
        fullname: user.fullname,
        email: user.email,
        dateOfBirth: user.dateOfBirth ?? null,
        gender: user.gender ?? null,
        cohort: user.cohort ?? null,
        enrolledAt: enrolledAt.toISOString(),
      })),
    };
  }

  async expandCourseSectionCapacity(sectionId: number) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      select: { id: true, capacity: true },
    });
    if (!section) {
      throw new NotFoundException('Không tìm thấy lớp học phần.');
    }
    if (section.capacity === null || section.capacity >= 300) {
      return section;
    }
    return this.prisma.courseSection.update({
      where: { id: sectionId },
      data: { capacity: 300 },
      select: { id: true, capacity: true },
    });
  }

  async importSectionRoster(
    sectionId: number,
    rawStudents: Array<string | ImportSectionStudentDto>,
  ) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      select: { id: true, capacity: true },
    });
    if (!section) {
      throw new NotFoundException('Không tìm thấy lớp học phần.');
    }

    const seen = new Set<string>();
    const resetPasswordCodes = new Set<string>();
    const requestedStudents: ImportSectionStudentDto[] = [];
    const duplicateCodes: string[] = [];
    for (const rawStudent of rawStudents) {
      const student = typeof rawStudent === 'string'
        ? { studentCode: rawStudent }
        : rawStudent;
      const code = student.studentCode.trim();
      if (!code) continue;
      if (seen.has(code)) {
        duplicateCodes.push(code);
      } else {
        seen.add(code);
        requestedStudents.push({ ...student, studentCode: code });
        if (typeof rawStudent !== 'string') {
          resetPasswordCodes.add(code);
        }
      }
    }
    if (requestedStudents.length === 0) {
      throw new BadRequestException('File không có mã sinh viên hợp lệ.');
    }

    const users = await this.prisma.user.findMany({
      where: { code: { in: requestedStudents.map(({ studentCode }) => studentCode) } },
      select: {
        id: true,
        code: true,
        role: true,
        fullname: true,
        dateOfBirth: true,
        gender: true,
        cohort: true,
        account: { select: { username: true } },
      },
    });
    const usersByCode = new Map(users.map((user) => [user.code, user]));
    const requestedUsernames = requestedStudents
      .filter(({ studentCode }) => {
        const user = usersByCode.get(studentCode);
        return !user || !user.account;
      })
      .map(({ username, studentCode }) => username?.trim() || studentCode);
    const accounts = requestedUsernames.length > 0
      ? await this.prisma.account.findMany({
          where: { username: { in: requestedUsernames } },
          select: { username: true, userId: true },
        })
      : [];
    const accountsByUsername = new Map(accounts.map((account) => [account.username, account]));
    const usernameCodes = new Map<string, string>();
    const usernameConflictCodes: string[] = [];
    const missingAccountDataCodes: string[] = [];
    const unknownCodes: string[] = [];
    const conflictingCodes: string[] = [];
    const importableRows: Array<{
      student: ImportSectionStudentDto;
      existingUser: (typeof users)[number] | null;
      fullname: string;
    }> = [];

    for (const student of requestedStudents) {
      const existingUser = usersByCode.get(student.studentCode);
      if (existingUser && existingUser.role !== 'participant') {
        conflictingCodes.push(student.studentCode);
        continue;
      }
      const fullname = student.fullname?.trim() ||
        [student.middleName?.trim(), student.firstName?.trim()].filter(Boolean).join(' ');
      if (!existingUser && !fullname) {
        missingAccountDataCodes.push(student.studentCode);
        unknownCodes.push(student.studentCode);
        continue;
      }
      if (!existingUser || !existingUser.account) {
        const username = student.username?.trim() || student.studentCode;
        const previousCode = usernameCodes.get(username);
        const account = accountsByUsername.get(username);
        if (previousCode || account) {
          usernameConflictCodes.push(student.studentCode);
          continue;
        }
        usernameCodes.set(username, student.studentCode);
      }
      importableRows.push({ student, existingUser: existingUser ?? null, fullname });
    }

    const passwordHashes = new Map<string, string>();
    const rowsNeedingPasswordHash = [
      ...importableRows.filter(({ student, existingUser }) =>
        existingUser && resetPasswordCodes.has(student.studentCode),
      ),
      ...importableRows.filter(({ existingUser }) => !existingUser).slice(0, 300),
    ];
    for (let index = 0; index < rowsNeedingPasswordHash.length; index += 50) {
      await Promise.all(rowsNeedingPasswordHash.slice(index, index + 50).map(async ({ student }) => {
          passwordHashes.set(
            student.studentCode,
            await bcrypt.hash(student.studentCode, 10),
          );
      }));
    }

    return this.prisma.$transaction(async (transaction) => {
      const importableUserIds = importableRows
        .flatMap(({ existingUser }) => existingUser ? [existingUser.id] : []);
      const existing = await transaction.classEnrollment.findMany({
        where: {
          courseSectionId: sectionId,
          userId: { in: importableUserIds },
        },
        select: { userId: true, status: true },
      });
      const activeUserIds = new Set(
        existing.filter((enrollment) => enrollment.status === 'active').map((enrollment) => enrollment.userId),
      );
      const activeEnrollmentCount = await transaction.classEnrollment.count({
        where: { courseSectionId: sectionId, status: 'active' },
      });
      await Promise.all(importableRows.map(({ student, existingUser, fullname }) => {
        if (!existingUser) return null;
        const shouldResetPassword = resetPasswordCodes.has(student.studentCode);
        const passwordHash = shouldResetPassword
          ? passwordHashes.get(student.studentCode)
          : undefined;
        if (shouldResetPassword && !passwordHash) {
          throw new BadRequestException(
            `Không tạo được thông tin xác thực cho sinh viên ${student.studentCode}.`,
          );
        }
        return transaction.user.update({
          where: { id: existingUser.id },
          data: {
            ...(fullname ? { fullname } : {}),
            email: `${student.studentCode}@dlu.edu.vn`,
            ...(student.dateOfBirth ? { dateOfBirth: student.dateOfBirth } : {}),
            ...(student.gender ? { gender: student.gender.trim() } : {}),
            ...(student.cohort ? { cohort: student.cohort.trim() } : {}),
            ...(passwordHash
              ? {
                  account: existingUser.account
                    ? { update: { passwordHash } }
                    : {
                        create: {
                          username: student.username?.trim() || student.studentCode,
                          passwordHash,
                        },
                      },
                }
              : {}),
          },
        });
      }));
      const alreadyEnrolledRows = importableRows.filter(
        ({ existingUser }) => existingUser && activeUserIds.has(existingUser.id),
      );
      const candidates = importableRows.filter(
        ({ existingUser }) => !existingUser || !activeUserIds.has(existingUser.id),
      );
      const availableSlots =
        Math.max(0, Math.min(section.capacity ?? 300, 300) - activeEnrollmentCount);
      const acceptedRows = candidates.slice(0, availableSlots);
      const capacityExceededCodes = candidates
        .slice(availableSlots)
        .map(({ student }) => student.studentCode);

      const acceptedUsers = await Promise.all(acceptedRows.map(async (row) => {
        const { student, existingUser, fullname } = row;
        const profile = {
          fullname: fullname || existingUser?.fullname || student.studentCode,
          email: `${student.studentCode}@dlu.edu.vn`,
          ...(student.dateOfBirth ? { dateOfBirth: student.dateOfBirth } : {}),
          ...(student.gender ? { gender: student.gender.trim() } : {}),
          ...(student.cohort ? { cohort: student.cohort.trim() } : {}),
        };
        if (existingUser) {
          return { id: existingUser.id, code: existingUser.code };
        }

        const passwordHash = passwordHashes.get(student.studentCode);
        if (!passwordHash) {
          throw new BadRequestException(
            `Không tạo được thông tin xác thực cho sinh viên ${student.studentCode}.`,
          );
        }
        return transaction.user.create({
          data: {
            code: student.studentCode,
            role: 'participant',
            ...profile,
            account: {
              create: {
                username: student.username?.trim() || student.studentCode,
                passwordHash,
              },
            },
          },
          select: { id: true, code: true },
        });
      }));

      await Promise.all(
        acceptedUsers.map((user) =>
          transaction.classEnrollment.upsert({
            where: {
              courseSectionId_userId: { courseSectionId: sectionId, userId: user.id },
            },
            update: { status: 'active' },
            create: { courseSectionId: sectionId, userId: user.id, status: 'active' },
          }),
        ),
      );

      return {
        importedCodes: acceptedUsers.map((user) => user.code),
        alreadyEnrolledCodes: alreadyEnrolledRows.map(({ student }) => student.studentCode),
        unknownCodes,
        duplicateCodes,
        capacityExceededCodes,
        createdAccountCodes: acceptedUsers
          .filter((user) => !usersByCode.has(user.code))
          .map((user) => user.code),
        usernameConflictCodes,
        missingAccountDataCodes,
        conflictingCodes,
      };
    }, { timeout: 30_000 });
  }

  async createTimetableSlot(
    sectionId: number,
    input: {
      dayOfWeek?: number;
      scheduledDate?: string;
      startMinute: number;
      endMinute: number;
      roomId?: number;
    },
  ) {
    const scheduledDate = input.scheduledDate
      ? new Date(`${input.scheduledDate}T00:00:00.000Z`)
      : null;
    const dayOfWeek = scheduledDate
      ? scheduledDate.getUTCDay() || 7
      : input.dayOfWeek;
    if (dayOfWeek === undefined) {
      throw new BadRequestException('Vui lòng chọn Thứ hoặc ngày học cụ thể.');
    }
    const normalizedInput = { ...input, dayOfWeek, scheduledDate };
    await this.assertTimetableSlotInput(sectionId, normalizedInput);
    return this.prisma.timetableSlot.create({
      data: {
        courseSectionId: sectionId,
        dayOfWeek,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        ...(input.roomId !== undefined ? { roomId: input.roomId } : {}),
        scheduledDate,
      },
      include: { room: { select: { id: true, code: true, name: true } } },
    });
  }

  async updateTimetableSlot(
    sectionId: number,
    slotId: number,
    input: {
      dayOfWeek?: number;
      scheduledDate?: string | null;
      startMinute?: number;
      endMinute?: number;
      roomId?: number | null;
    },
  ) {
    const existing = await this.prisma.timetableSlot.findFirst({
      where: { id: slotId, courseSectionId: sectionId },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy ca học trong lớp học phần.');
    }

    const scheduledDate = input.scheduledDate === undefined
      ? existing.scheduledDate
      : input.scheduledDate === null
        ? null
        : new Date(`${input.scheduledDate}T00:00:00.000Z`);
    const dayOfWeek = input.scheduledDate
      ? scheduledDate!.getUTCDay() || 7
      : input.dayOfWeek ?? existing.dayOfWeek;
    const updatedInput = {
      dayOfWeek,
      scheduledDate,
      startMinute: input.startMinute ?? existing.startMinute,
      endMinute: input.endMinute ?? existing.endMinute,
      roomId: input.roomId === undefined
        ? existing.roomId ?? undefined
        : input.roomId ?? undefined,
    };
    await this.assertTimetableSlotInput(sectionId, updatedInput, slotId);
    return this.prisma.timetableSlot.update({
      where: { id: slotId },
      data: {
        dayOfWeek,
        scheduledDate,
        ...(input.startMinute !== undefined ? { startMinute: input.startMinute } : {}),
        ...(input.endMinute !== undefined ? { endMinute: input.endMinute } : {}),
        ...(input.roomId !== undefined ? { roomId: input.roomId } : {}),
      },
      include: { room: { select: { id: true, code: true, name: true } } },
    });
  }

  async deleteTimetableSlot(sectionId: number, slotId: number): Promise<void> {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id: slotId, courseSectionId: sectionId },
      include: { _count: { select: { attendanceSessions: true } } },
    });
    if (!slot) {
      throw new NotFoundException('Không tìm thấy ca học trong lớp học phần.');
    }
    if (slot._count.attendanceSessions > 0) {
      throw new ConflictException(
        'Không thể xóa ca học đã được dùng cho phiên điểm danh.',
      );
    }
    await this.prisma.timetableSlot.delete({ where: { id: slotId } });
  }

  private async assertTimetableSlotInput(
    sectionId: number,
    input: {
      dayOfWeek: number;
      scheduledDate?: Date | null;
      startMinute: number;
      endMinute: number;
      roomId?: number;
    },
    excludeSlotId?: number,
  ): Promise<void> {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        roomId: true,
        term: { select: { startDate: true, endDate: true } },
      },
    });
    if (!section) {
      throw new NotFoundException('Không tìm thấy lớp học phần.');
    }
    if (input.endMinute <= input.startMinute) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu.');
    }
    if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 1 || input.dayOfWeek > 7) {
      throw new BadRequestException('Vui lòng chọn một Thứ hợp lệ.');
    }
    if (input.scheduledDate) {
      const dateKey = input.scheduledDate.toISOString().slice(0, 10);
      const termStart = section.term.startDate.toISOString().slice(0, 10);
      const termEnd = section.term.endDate.toISOString().slice(0, 10);
      if (dateKey < termStart || dateKey > termEnd) {
        throw new BadRequestException('Ngày học cụ thể phải nằm trong khoảng ngày của học kỳ.');
      }
    }

    const effectiveRoomId = input.roomId ?? section.roomId ?? undefined;
    if (effectiveRoomId !== undefined) {
      const room = await this.prisma.room.findUnique({
        where: { id: effectiveRoomId },
        select: { status: true },
      });
      if (!room || room.status !== 'ACTIVE') {
        throw new BadRequestException(
          'Phòng học được chọn không hợp lệ hoặc đã ngừng sử dụng.',
        );
      }
    }

    const overlappingSlots = await this.prisma.timetableSlot.findMany({
      where: {
        dayOfWeek: input.dayOfWeek,
        startMinute: { lt: input.endMinute },
        endMinute: { gt: input.startMinute },
        ...(excludeSlotId !== undefined ? { id: { not: excludeSlotId } } : {}),
      },
      select: {
        id: true,
        courseSectionId: true,
        roomId: true,
        scheduledDate: true,
        courseSection: { select: { roomId: true } },
      },
    });
    const targetDateKey = input.scheduledDate?.toISOString().slice(0, 10) ?? null;
    const overlap = overlappingSlots.some(
      (slot) =>
        (targetDateKey === null ||
          slot.scheduledDate === null ||
          slot.scheduledDate.toISOString().slice(0, 10) === targetDateKey) &&
        (slot.courseSectionId === sectionId ||
          (effectiveRoomId !== undefined &&
            (slot.roomId ?? slot.courseSection.roomId) === effectiveRoomId)),
    );
    if (overlap) {
      throw new ConflictException(
        'Ca học bị trùng giờ với một ca khác trong cùng ngày hoặc phòng đã được dùng.',
      );
    }
  }

  async getDetail(
    sessionId: number,
    user?: { userId: number; role: string },
  ): Promise<AttendanceSessionDetailResponse> {
    const session = user
      ? await this.attendanceSessionsService.findByIdForUser(sessionId, user)
      : await this.attendanceSessionsService.findById(sessionId);

    const records =
      await this.attendanceRecordsService.findBySessionId(sessionId);

    const users = await this.usersService.findByIds(
      records.map((record) => record.userId),
    );

    const attempts = await this.prisma.attendanceAttempt.findMany({
      where: { sessionId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const historyEvents = await this.prisma.attendanceHistoryEvent.findMany({
      where: { sessionId },
      include: { actor: { select: { fullname: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const latestLecturerVerification = await this.prisma.lecturerLocationVerification.findFirst({
      where: { sessionId, status: 'PASS' },
      orderBy: { createdAt: 'desc' },
    });
    const registeredDevices = attempts.length
      ? await this.prisma.registeredDevice.findMany({
          where: {
            userId: { in: [...new Set(attempts.map((attempt) => attempt.userId))] },
            deviceId: { in: [...new Set(attempts.map((attempt) => attempt.deviceId))] },
          },
          select: { id: true, userId: true, deviceId: true, trustStatus: true },
        })
      : [];
    const deviceByUserAndId = new Map(
      registeredDevices.map((device) => [
        `${device.userId}:${device.deviceId}`,
        device,
      ]),
    );
    const geo = this.geoService ?? new GeoService();

    const mappedAttempts: AttendanceAttemptDto[] = attempts.map((attempt) => {
      const device = deviceByUserAndId.get(`${attempt.userId}:${attempt.deviceId}`);
      let distanceToLecturer: number | null = null;
      let lecturerProximityVerdict: 'NEAR' | 'FAR' | 'NO_DATA' | null = null;

      if (latestLecturerVerification) {
        distanceToLecturer = Math.round(
          geo.getDistanceInMeters(
            Number(attempt.latitude),
            Number(attempt.longitude),
            Number(latestLecturerVerification.latitude),
            Number(latestLecturerVerification.longitude),
          ),
        );
        const nearThreshold = session.lecturerValidationRadius ?? 25;
        lecturerProximityVerdict = distanceToLecturer <= nearThreshold ? 'NEAR' : 'FAR';
      } else {
        lecturerProximityVerdict = 'NO_DATA';
      }

      return {
        registeredDeviceId: device?.id ?? null,
        deviceTrustStatus: device?.trustStatus ?? null,
        id: attempt.id,
        userId: attempt.userId,
        userCode: attempt.user.code,
        userFullname: attempt.user.fullname,
        latitude: Number(attempt.latitude),
        longitude: Number(attempt.longitude),
        accuracy: Number(attempt.accuracy),
        distanceToCenter: Number(attempt.distanceToCenter),
        distanceToLecturer,
        lecturerProximityVerdict,
        deviceId: attempt.deviceId,
        isMockLocation: attempt.isMockLocation,
        serverTimestamp: attempt.serverTimestamp.toISOString(),
        result: attempt.result,
        reasons: attempt.reasons,
        reviewedAt: attempt.reviewedAt?.toISOString() ?? null,
        reviewedBy: attempt.reviewedBy,
        reviewNote: attempt.reviewNote,
        reviewReason: attempt.reviewReason,
      };
    });

    const mappedHistoryEvents: AttendanceHistoryEventDto[] = historyEvents.map(
      (event) => ({
        id: event.id,
        sessionId: event.sessionId,
        attemptId: event.attemptId,
        sessionTitle: session.title,
        eventType: event.eventType,
        status: event.status,
        attemptResult: event.attemptResult,
        reasons: event.reasons,
        reviewReason: event.reviewReason,
        note: event.note,
        actorName: event.actor?.fullname ?? null,
        createdAt: event.createdAt.toISOString(),
      }),
    );

    return this.toDetail(session, records, users, mappedAttempts, mappedHistoryEvents);
  }

  async getLecturerAnalytics(
    lecturerId: number,
    isAdmin = false,
  ): Promise<LecturerAttendanceAnalytics> {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: isAdmin ? {} : { createdBy: lecturerId },
      select: {
        attendanceRecords: {
          select: {
            userId: true,
            status: true,
            user: { select: { code: true, fullname: true } },
          },
        },
        attempts: {
          where: { result: 'REVIEW' },
          select: { id: true },
        },
      },
    });

    const records = sessions.flatMap((session) => session.attendanceRecords);
    const count = (status: string) =>
      records.filter((record) => record.status === status).length;
    const presentCount = count('present');
    const lateCount = count('late');
    const absentCount = count('absent');
    const excusedCount = count('excused');
    const totalRecords = records.length;
    const attendanceRate = totalRecords
      ? Math.round(
          ((presentCount + lateCount + excusedCount) / totalRecords) * 100,
        )
      : 0;

    const byStudent = new Map<
      number,
      { userCode: string; fullname: string; absentCount: number; total: number; attended: number }
    >();
    for (const record of records) {
      const student = byStudent.get(record.userId) ?? {
        userCode: record.user.code,
        fullname: record.user.fullname,
        absentCount: 0,
        total: 0,
        attended: 0,
      };
      student.total += 1;
      if (record.status === 'absent') student.absentCount += 1;
      if (record.status === 'present' || record.status === 'late' || record.status === 'excused') {
        student.attended += 1;
      }
      byStudent.set(record.userId, student);
    }

    const atRiskStudents = [...byStudent.entries()]
      .map(([userId, student]) => ({
        userId,
        userCode: student.userCode,
        fullname: student.fullname,
        absentCount: student.absentCount,
        totalSessions: student.total,
        attendanceRate: Math.round((student.attended / student.total) * 100),
      }))
      .filter((student) => student.absentCount > 0)
      .sort((left, right) =>
        right.absentCount - left.absentCount || left.attendanceRate - right.attendanceRate,
      )
      .slice(0, 10);

    return {
      totalSessions: sessions.length,
      totalStudents: byStudent.size,
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
      reviewCount: sessions.reduce((sum, session) => sum + session.attempts.length, 0),
      atRiskStudents,
    };
  }

  async reviewAttempt(
    sessionId: number,
    attemptId: number,
    reviewerId: number,
    reviewerRole: string,
    decision: AttendanceReviewDecision,
    note: string,
    reviewReason = 'OTHER',
  ): Promise<void> {
    await this.attendanceSessionsService.findByIdForUser(sessionId, {
      userId: reviewerId,
      role: reviewerRole,
    });

    const attempt = await this.prisma.attendanceAttempt.findFirst({
      where: { id: attemptId, sessionId },
    });
    if (!attempt) {
      throw new NotFoundException('Không tìm thấy lượt điểm danh cần xem xét');
    }
    if (attempt.result !== 'REVIEW') {
      throw new ConflictException('Lượt điểm danh này đã được xử lý');
    }

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.attendanceAttempt.updateMany({
        where: { id: attemptId, sessionId, result: 'REVIEW' },
        data: {
          result: decision,
          reviewedBy: reviewerId,
          reviewedAt,
          reviewNote: note,
          reviewReason,
        },
      });
      if (updateResult.count !== 1) {
        throw new ConflictException('Lượt điểm danh đã được xử lý trước đó');
      }

      const finalStatus = decision === 'APPROVED' ? 'present' : 'absent';

      await transaction.attendanceRecord.upsert({
        where: {
          sessionId_userId: { sessionId, userId: attempt.userId },
        },
        update: {
          status: finalStatus,
          deviceId: attempt.deviceId,
          checkedInAt:
            decision === 'APPROVED' ? attempt.serverTimestamp : null,
          latitude: attempt.latitude,
          longitude: attempt.longitude,
          accuracy: attempt.accuracy,
          distanceMeters: attempt.distanceToCenter,
          updatedBy: reviewerId,
        },
        create: {
          sessionId,
          userId: attempt.userId,
          status: finalStatus,
          deviceId: attempt.deviceId,
          checkedInAt:
            decision === 'APPROVED' ? attempt.serverTimestamp : null,
          latitude: attempt.latitude,
          longitude: attempt.longitude,
          accuracy: attempt.accuracy,
          distanceMeters: attempt.distanceToCenter,
          updatedBy: reviewerId,
        },
      });

      await transaction.attendanceHistoryEvent.create({
        data: {
          sessionId,
          userId: attempt.userId,
          actorId: reviewerId,
          attemptId,
          eventType: 'REVIEW_DECISION',
          status: finalStatus,
          attemptResult: decision,
          reasons: attempt.reasons,
          reviewReason,
          note,
        },
      });
    });
  }

  private toDetail(
    session: AttendanceSession,
    records: AttendanceRecord[],
    users: User[],
    attempts: AttendanceAttemptDto[],
    historyEvents: AttendanceHistoryEventDto[],
  ): AttendanceSessionDetailResponse {
    const usersById = new Map(users.map((user) => [user.id, user]));

    return {
      ...this.toSessionBase(session),

      participants: records.map((record) => {
        const user = usersById.get(record.userId);

        if (!user) {
          throw new Error(`User ${record.userId} not found`);
        }

        return {
          user: {
            id: user.id,
            code: user.code,
            role: user.role,
            fullname: user.fullname,
          },
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
          updatedAt: record.updatedAt.toISOString(),
        };
      }),

      attempts,
      historyEvents,
    };
  }

  async getMySessions(userId: number): Promise<MyAttendanceSessionResponse[]> {
    const records = await this.attendanceRecordsService.findByUser(userId);

    if (records.length === 0) return [];

    const sessionIds = records.map((r) => r.sessionId);
    const sessions = await this.attendanceSessionsService.findByIds(sessionIds);

    return this.toMySessionsResponse(sessions, records);
  }

  private toMySessionsResponse(
    sessions: AttendanceSession[],
    records: AttendanceRecord[],
  ): MyAttendanceSessionResponse[] {
    const recordBySessionId = new Map(
      records.map((record) => [record.sessionId, record]),
    );

    return sessions.map((session) => {
      const record = recordBySessionId.get(session.id);

      if (!record) {
        throw new Error(`Record cho session ${session.id} không tồn tại`);
      }

      return {
        ...this.toSessionBase(session),

        myAttendance: {
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
        },
      };
    });
  }

  private toSessionBase(session: AttendanceSession): AttendanceSessionResponse {
    return {
      id: session.id,
      title: session.title,
      latitude: session.latitude,
      longitude: session.longitude,
      radius: session.radius,
      openAt: session.openAt.toISOString(),
      closeAt: session.closeAt.toISOString(),
      status: session.status,
      location: {
        building: session.building ?? null,
        room: session.room ?? null,
      },
    };
  }
}
