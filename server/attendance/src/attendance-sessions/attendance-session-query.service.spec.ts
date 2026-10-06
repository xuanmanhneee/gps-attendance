import { ConflictException, ForbiddenException } from '@nestjs/common';
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

    const result = await service.getSectionRoster(4, { userId: 9, role: 'lecturer' });

    expect(result.students).toEqual([{
      id: 101,
      code: 'SV001',
      fullname: 'Nguyễn An',
      email: null,
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
      service.getSectionRoster(4, { userId: 9, role: 'lecturer' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.classEnrollment.findMany).not.toHaveBeenCalled();
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
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 5 }) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, code: 'S001' },
          { id: 11, code: 'S002' },
        ]),
      },
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
    };
    const prisma = {
      courseSection: { findUnique: jest.fn().mockResolvedValue({ id: 4, capacity: 1 }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 11, code: 'S002' }]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const result = await service.importSectionRoster(4, ['S002']);

    expect(result.importedCodes).toEqual([]);
    expect(result.capacityExceededCodes).toEqual(['S002']);
    expect(tx.classEnrollment.upsert).not.toHaveBeenCalled();
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

    await service.reviewAttempt(12, 8, 7, 'lecturer', 'APPROVED', 'Đã xác minh tại lớp');

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

    await service.reviewAttempt(12, 8, 7, 'lecturer', 'REJECTED', 'Vị trí không hợp lệ');

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
      service.reviewAttempt(12, 8, 7, 'lecturer', 'REJECTED', 'Đã xác minh'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
