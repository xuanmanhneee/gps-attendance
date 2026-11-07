import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AttendanceSessionQueryService } from './attendance-session-query.service';

describe('AttendanceSessionQueryService', () => {
  const makeService = (prisma: Record<string, any>) =>
    new AttendanceSessionQueryService(
      { findByIdForUser: jest.fn().mockResolvedValue({ id: 12 }) } as any,
      {} as any,
      {} as any,
      prisma as any,
    );

  it('returns the active roster for an assigned lecturer', async () => {
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          code: 'CNTT101-01',
          capacity: 60,
          lecturerId: 9,
          course: { code: 'CNTT101', name: 'Nhập môn CNTT' },
          term: { name: 'Học kỳ 1', academicYear: '2026-2027', semester: 1 },
        }),
      },
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([{
          user: { id: 101, code: 'SV001', fullname: 'Nguyễn An', email: null },
          enrolledAt: new Date('2026-09-01T00:00:00.000Z'),
        }]),
      },
    };
    const service = makeService(prisma);

    const result = await service.getSectionRoster(4, { userId: 9, role: 'organizer' });

    expect(result.students).toEqual([{
      id: 101,
      code: 'SV001',
      fullname: 'Nguyễn An',
      email: null,
      dateOfBirth: null,
      gender: null,
      cohort: null,
      enrolledAt: '2026-09-01T00:00:00.000Z',
    }]);
    expect(prisma.classEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseSectionId: 4, status: 'active' } }),
    );
  });

  it('denies roster access to lecturers not assigned to the section', async () => {
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, lecturerId: 10 }),
      },
      classEnrollment: { findMany: jest.fn() },
    };
    const service = makeService(prisma);

    await expect(
      service.getSectionRoster(4, { userId: 9, role: 'organizer' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.classEnrollment.findMany).not.toHaveBeenCalled();
  });

  it('expands an existing section capacity to 300', async () => {
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 40 }),
        update: jest.fn().mockResolvedValue({ id: 4, capacity: 300 }),
      },
    };
    const service = makeService(prisma);

    await expect(service.expandCourseSectionCapacity(4)).resolves.toEqual({
      id: 4,
      capacity: 300,
    });
    expect(prisma.courseSection.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { capacity: 300 },
      select: { id: true, capacity: true },
    });
  });

  it('does not update a section that already has capacity 300', async () => {
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 300 }),
        update: jest.fn(),
      },
    };
    const service = makeService(prisma);

    await expect(service.expandCourseSectionCapacity(4)).resolves.toEqual({
      id: 4,
      capacity: 300,
    });
    expect(prisma.courseSection.update).not.toHaveBeenCalled();
  });

  it('reports a missing section when expanding capacity', async () => {
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const service = makeService(prisma);

    await expect(service.expandCourseSectionCapacity(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.courseSection.update).not.toHaveBeenCalled();
  });

  it('summarizes only scoped sessions and ranks absent students', async () => {
    const prisma = {
      attendanceSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            attendanceRecords: [
              {
                userId: 4,
                status: 'absent',
                user: { code: 'S004', fullname: 'Student Four' },
              },
              {
                userId: 4,
                status: 'present',
                user: { code: 'S004', fullname: 'Student Four' },
              },
              {
                userId: 5,
                status: 'late',
                user: { code: 'S005', fullname: 'Student Five' },
              },
            ],
            attempts: [{ id: 90 }],
          },
        ]),
      },
    };
    const service = makeService(prisma);

    const analytics = await service.getLecturerAnalytics(2);

    expect(prisma.attendanceSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdBy: 2 } }),
    );
    expect(analytics).toMatchObject({
      totalSessions: 1,
      totalStudents: 2,
      totalRecords: 3,
      presentCount: 1,
      lateCount: 1,
      absentCount: 1,
      attendanceRate: 67,
      reviewCount: 1,
      atRiskStudents: [
        {
          userId: 4,
          absentCount: 1,
          totalSessions: 2,
          attendanceRate: 50,
        },
      ],
    });
  });

  it('imports existing student codes, reporting duplicates and unknown codes', async () => {
    const tx = {
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([{ userId: 10, status: 'active' }]),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({ id: 11, code: 'S002' }) },
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 5 }) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, code: 'S001', role: 'participant', fullname: 'Student One', account: { username: 'S001' } },
          { id: 11, code: 'S002', role: 'participant', fullname: 'Student Two', account: { username: 'S002' } },
        ]),
      },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importSectionRoster(4, [
      'S001',
      ' S002 ',
      'UNKNOWN',
      'S002',
    ]);

    expect(result).toEqual({
      importedCodes: ['S002'],
      alreadyEnrolledCodes: ['S001'],
      unknownCodes: ['UNKNOWN'],
      duplicateCodes: ['S002'],
      capacityExceededCodes: [],
      createdAccountCodes: [],
      usernameConflictCodes: [],
      missingAccountDataCodes: ['UNKNOWN'],
      conflictingCodes: [],
    });
    expect(tx.classEnrollment.upsert).toHaveBeenCalledWith({
      where: { courseSectionId_userId: { courseSectionId: 4, userId: 11 } },
      update: { status: 'active' },
      create: { courseSectionId: 4, userId: 11, status: 'active' },
    });
  });

  it('does not import students beyond section capacity', async () => {
    const tx = {
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({ id: 11, code: 'S002' }) },
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 1 }) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 11, code: 'S002', role: 'participant', fullname: 'Student Two', account: { username: 'S002' } },
        ]),
      },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importSectionRoster(4, ['S002']);

    expect(result.importedCodes).toEqual([]);
    expect(result.capacityExceededCodes).toEqual(['S002']);
    expect(result.createdAccountCodes).toEqual([]);
    expect(result.usernameConflictCodes).toEqual([]);
    expect(result.missingAccountDataCodes).toEqual([]);
    expect(result.conflictingCodes).toEqual([]);
    expect(tx.classEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('caps sections without an explicit capacity at 300 students', async () => {
    const students = Array.from({ length: 301 }, (_, index) => ({
      id: index + 1,
      code: `S${String(index + 1).padStart(3, '0')}`,
      role: 'participant',
      fullname: `Student ${index + 1}`,
      account: { username: `S${String(index + 1).padStart(3, '0')}` },
    }));
    const tx = {
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: {
        update: jest.fn((args: { where: { id: number } }) =>
          Promise.resolve({
            id: args.where.id,
            code: `S${String(args.where.id).padStart(3, '0')}`,
          }),
        ),
      },
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: null }) },
      user: { findMany: jest.fn().mockResolvedValue(students) },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importSectionRoster(
      4,
      students.map(({ code }) => code),
    );

    expect(result.importedCodes).toHaveLength(300);
    expect(result.capacityExceededCodes).toEqual(['S301']);
    expect(tx.classEnrollment.upsert).toHaveBeenCalledTimes(300);
  });

  it('creates a student account with a hashed student-code initial password', async () => {
    const tx = {
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 25, code: 'SV025' }),
      },
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 5 }) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importSectionRoster(4, [{
      studentCode: 'SV025',
      username: 'sv025',
      middleName: 'Nguyễn Văn',
      firstName: 'An',
      dateOfBirth: '2005-01-31',
      gender: 'Nam',
      cohort: 'CTK47B',
    }]);

    expect(result.createdAccountCodes).toEqual(['SV025']);
    expect(result.importedCodes).toEqual(['SV025']);
    const createCall = tx.user.create.mock.calls[0][0];
    expect(createCall.data).toMatchObject({
      code: 'SV025',
      role: 'participant',
      fullname: 'Nguyễn Văn An',
      email: 'SV025@dlu.edu.vn',
      dateOfBirth: '2005-01-31',
      gender: 'Nam',
      cohort: 'CTK47B',
      account: { create: { username: 'sv025' } },
    });
    await expect(
      bcrypt.compare('SV025', createCall.data.account.create.passwordHash),
    ).resolves.toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 30_000 },
    );
  });

  it('uses the student code as username when a new roster row has no username', async () => {
    const tx = {
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 26, code: 'SV026' }),
      },
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 5 }) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    await service.importSectionRoster(4, [{
      studentCode: 'SV026',
      fullname: 'Trần Văn Bình',
    }]);

    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        account: { create: expect.objectContaining({ username: 'SV026' }) },
      }),
    }));
  });

  it('updates an existing student profile and resets its password to the student code', async () => {
    const tx = {
      classEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({ id: 26, code: 'SV026' }) },
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 5 }) },
      user: {
        findMany: jest.fn().mockResolvedValue([{
          id: 26,
          code: 'SV026',
          role: 'participant',
          fullname: 'Tên cũ',
          email: 'old@example.com',
          account: { username: 'sv026' },
        }]),
      },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importSectionRoster(4, [{
      studentCode: 'SV026',
      username: 'sv026',
      middleName: 'Trần Văn',
      firstName: 'Bình',
      dateOfBirth: '2004-07-31',
      gender: 'Nam',
      cohort: 'CTK47B',
    }]);

    expect(result.importedCodes).toEqual(['SV026']);
    const updateCall = tx.user.update.mock.calls[0][0];
    expect(updateCall).toEqual(expect.objectContaining({
      where: { id: 26 },
      data: expect.objectContaining({
        fullname: 'Trần Văn Bình',
        email: 'SV026@dlu.edu.vn',
        dateOfBirth: '2004-07-31',
        gender: 'Nam',
        cohort: 'CTK47B',
        account: { update: { passwordHash: expect.any(String) } },
      }),
    }));
    await expect(
      bcrypt.compare('SV026', updateCall.data.account.update.passwordHash),
    ).resolves.toBe(true);
  });

  it('creates a course section with reusable course and academic term records', async () => {
    const createdSection = { id: 20, code: 'CNTT101-01' };
    const tx = {
      course: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 3, code: 'CNTT101' }),
      },
      academicTerm: {
        upsert: jest.fn().mockResolvedValue({ id: 8 }),
      },
      user: { findUnique: jest.fn() },
      room: { findUnique: jest.fn() },
      courseSection: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdSection),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.createCourseSection({
      courseCode: ' CNTT101 ',
      courseName: 'Nhập môn CNTT',
      sectionCode: ' CNTT101-01 ',
      academicYear: '2026-2027',
      semester: 1,
      termName: 'Học kỳ 1 năm học 2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-01-15',
      capacity: 60,
    });

    expect(result).toBe(createdSection);
    expect(tx.course.create).toHaveBeenCalledWith({
      data: { code: 'CNTT101', name: 'Nhập môn CNTT', credits: undefined },
    });
    expect(tx.academicTerm.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { academicYear_semester: { academicYear: '2026-2027', semester: 1 } },
      }),
    );
    expect(tx.courseSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'CNTT101-01',
          courseId: 3,
          termId: 8,
          capacity: 60,
        }),
      }),
    );
  });

  it('imports new course codes and reports existing and duplicate entries', async () => {
    const tx = {
      course: {
        findMany: jest.fn().mockResolvedValue([{ code: 'MATH101' }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importCourses([
      { code: 'CNTT101', name: 'Nhập môn CNTT', credits: 3 },
      { code: 'MATH101', name: 'Toán cao cấp 1' },
      { code: 'CNTT101', name: 'Bản ghi lặp' },
    ]);

    expect(result).toEqual({
      createdCodes: ['CNTT101'],
      existingCodes: ['MATH101'],
      duplicateCodes: ['CNTT101'],
    });
    expect(tx.course.createMany).toHaveBeenCalledWith({
      data: [{ code: 'CNTT101', name: 'Nhập môn CNTT', credits: 3, isActive: true }],
      skipDuplicates: true,
    });
  });

  it('saves reviewer metadata and marks an approved student present atomically', async () => {
    const attempt = {
      id: 8,
      sessionId: 12,
      userId: 31,
      result: 'REVIEW',
      deviceId: 'device-31',
      serverTimestamp: new Date('2026-09-01T08:01:00.000Z'),
      latitude: 10.1,
      longitude: 106.1,
      accuracy: 10,
      distanceToCenter: 20,
    };
    const tx = {
      attendanceAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) },
      attendanceHistoryEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      attendanceAttempt: { findFirst: jest.fn().mockResolvedValue(attempt) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    await service.reviewAttempt(12, 8, 7, 'organizer', 'APPROVED', 'Đã xác minh tại lớp');

    expect(tx.attendanceAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 8, sessionId: 12, result: 'REVIEW' },
        data: expect.objectContaining({
          result: 'APPROVED',
          reviewedBy: 7,
          reviewNote: 'Đã xác minh tại lớp',
        }),
      }),
    );
    expect(tx.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_userId: { sessionId: 12, userId: 31 } },
        update: expect.objectContaining({ status: 'present', updatedBy: 7 }),
      }),
    );
    expect(tx.attendanceHistoryEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'REVIEW_DECISION',
          attemptResult: 'APPROVED',
          note: 'Đã xác minh tại lớp',
        }),
      }),
    );
  });

  it('marks a rejected review as absent and logs the decision', async () => {
    const attempt = {
      id: 8,
      sessionId: 12,
      userId: 31,
      result: 'REVIEW',
      deviceId: 'device-31',
      serverTimestamp: new Date('2026-09-01T08:01:00.000Z'),
      latitude: 10.1,
      longitude: 106.1,
      accuracy: 10,
      distanceToCenter: 20,
      reasons: ['LOW_LOCATION_ACCURACY'],
    };
    const tx = {
      attendanceAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) },
      attendanceHistoryEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      attendanceAttempt: { findFirst: jest.fn().mockResolvedValue(attempt) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    await service.reviewAttempt(12, 8, 7, 'organizer', 'REJECTED', 'Vị trí không hợp lệ');

    expect(tx.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_userId: { sessionId: 12, userId: 31 } },
        update: expect.objectContaining({ status: 'absent', updatedBy: 7 }),
      }),
    );
    expect(tx.attendanceHistoryEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'REVIEW_DECISION',
          attemptResult: 'REJECTED',
          status: 'absent',
          note: 'Vị trí không hợp lệ',
        }),
      }),
    );
  });

  it('rejects stale review decisions to prevent double processing', async () => {
    const prisma = {
      attendanceAttempt: {
        findFirst: jest.fn().mockResolvedValue({ id: 8, result: 'APPROVED' }),
      },
      $transaction: jest.fn(),
    };
    const service = makeService(prisma);

    await expect(
      service.reviewAttempt(12, 8, 7, 'organizer', 'REJECTED', 'Đã xác minh'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a timetable slot for an existing section', async () => {
    const createdSlot = { id: 16, dayOfWeek: 1, startMinute: 480, endMinute: 540 };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4 }) },
      room: { findUnique: jest.fn() },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(createdSlot),
      },
    };
    const service = makeService(prisma);

    const result = await service.createTimetableSlot(4, {
      dayOfWeek: 1,
      startMinute: 480,
      endMinute: 540,
    });

    expect(result).toBe(createdSlot);
    expect(prisma.timetableSlot.create).toHaveBeenCalledWith({
      data: {
        courseSectionId: 4,
        dayOfWeek: 1,
        scheduledDate: null,
        startMinute: 480,
        endMinute: 540,
      },
      include: { room: { select: { id: true, code: true, name: true } } },
    });
  });

  it('creates a one-time timetable slot on the selected calendar date', async () => {
    const scheduledDate = new Date('2026-10-14T00:00:00.000Z');
    const createdSlot = {
      id: 17,
      dayOfWeek: 3,
      scheduledDate,
      startMinute: 600,
      endMinute: 660,
    };
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          roomId: null,
          term: {
            startDate: new Date('2026-09-01T00:00:00.000Z'),
            endDate: new Date('2027-01-15T00:00:00.000Z'),
          },
        }),
      },
      room: { findUnique: jest.fn() },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(createdSlot),
      },
    };
    const service = makeService(prisma);

    const result = await service.createTimetableSlot(4, {
      scheduledDate: '2026-10-14',
      startMinute: 600,
      endMinute: 660,
    });

    expect(result).toBe(createdSlot);
    expect(prisma.timetableSlot.create).toHaveBeenCalledWith({
      data: {
        courseSectionId: 4,
        dayOfWeek: 3,
        scheduledDate,
        startMinute: 600,
        endMinute: 660,
      },
      include: { room: { select: { id: true, code: true, name: true } } },
    });
  });

  it('allows same-time one-time slots on different calendar dates', async () => {
    const scheduledDate = new Date('2026-10-14T00:00:00.000Z');
    const prisma = {
      courseSection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          roomId: null,
          term: {
            startDate: new Date('2026-09-01T00:00:00.000Z'),
            endDate: new Date('2027-01-15T00:00:00.000Z'),
          },
        }),
      },
      room: { findUnique: jest.fn() },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 18,
            courseSectionId: 4,
            roomId: null,
            scheduledDate: new Date('2026-10-15T00:00:00.000Z'),
            courseSection: { roomId: null },
          },
        ]),
        create: jest.fn().mockResolvedValue({ id: 19 }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.createTimetableSlot(4, {
        scheduledDate: '2026-10-14',
        startMinute: 600,
        endMinute: 660,
      }),
    ).resolves.toEqual({ id: 19 });
    expect(prisma.timetableSlot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scheduledDate }),
      }),
    );
  });

  it('rejects overlapping timetable slots in the same section and day', async () => {
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4 }) },
      room: { findUnique: jest.fn() },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 15,
            courseSectionId: 4,
            roomId: null,
            courseSection: { roomId: null },
          },
        ]),
        create: jest.fn(),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.createTimetableSlot(4, {
        dayOfWeek: 1,
        startMinute: 510,
        endMinute: 570,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.timetableSlot.create).not.toHaveBeenCalled();
  });

  it('prevents deleting timetable slots already referenced by attendance sessions', async () => {
    const prisma = {
      timetableSlot: {
        findFirst: jest.fn().mockResolvedValue({
          id: 16,
          _count: { attendanceSessions: 1 },
        }),
        delete: jest.fn(),
      },
    };
    const service = makeService(prisma);

    await expect(service.deleteTimetableSlot(4, 16)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.timetableSlot.delete).not.toHaveBeenCalled();
  });
});
