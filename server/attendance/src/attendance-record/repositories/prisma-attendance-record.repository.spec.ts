import { PrismaAttendanceRecordRepository } from './prisma-attendance-record.repository';

describe('PrismaAttendanceRecordRepository.findDetailedHistoryByUser', () => {
  it('includes the latest check-in attempt result and reasons for each session', async () => {
    const prisma = {
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 19,
            sessionId: 4,
            userId: 12,
            status: 'absent',
            deviceId: null,
            checkedInAt: null,
            latitude: null,
            longitude: null,
            accuracy: null,
            distanceMeters: null,
            session: {
              title: 'Lập trình di động',
              openAt: new Date('2026-09-20T01:00:00.000Z'),
              closeAt: new Date('2026-09-20T02:00:00.000Z'),
              radius: { toNumber: () => 70 },
              latitude: { toNumber: () => 10.1 },
              longitude: { toNumber: () => 106.1 },
            },
          },
        ]),
      },
      attendanceAttempt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 22,
            sessionId: 4,
            result: 'REJECTED',
            reasons: ['OUT_OF_RANGE', 'LOW_LOCATION_ACCURACY'],
            reviewedAt: null,
            reviewNote: null,
            createdAt: new Date('2026-09-20T01:10:00.000Z'),
          },
          {
            id: 21,
            sessionId: 4,
            result: 'REVIEW',
            reasons: ['LOW_CONFIDENCE_SCORE'],
            reviewedAt: null,
            reviewNote: null,
            createdAt: new Date('2026-09-20T01:05:00.000Z'),
          },
        ]),
      },
    };
    const repository = new PrismaAttendanceRecordRepository(prisma as any);

    const history = await repository.findDetailedHistoryByUser(12);

    expect(prisma.attendanceAttempt.findMany).toHaveBeenCalledWith({
      where: { userId: 12, sessionId: { in: [4] } },
      orderBy: { createdAt: 'desc' },
    });
    expect(history[0]).toMatchObject({
      id: 19,
      sessionTitle: 'Lập trình di động',
      status: 'absent',
      attemptResult: 'REJECTED',
      attemptReasons: ['OUT_OF_RANGE', 'LOW_LOCATION_ACCURACY'],
      attemptReviewNote: null,
    });
  });
});
