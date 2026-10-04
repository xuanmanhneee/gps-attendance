import { ConflictException } from '@nestjs/common';
import { AttendanceSessionQueryService } from './attendance-session-query.service';

describe('AttendanceSessionQueryService', () => {
  const makeService = (prisma: Record<string, any>) =>
    new AttendanceSessionQueryService(
      { findByIdForUser: jest.fn().mockResolvedValue({ id: 12 }) } as any,
      {} as any,
      {} as any,
      prisma as any,
    );

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
