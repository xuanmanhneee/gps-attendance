import { PrismaAttendanceCheckInStore } from './prisma-attendance-check-in.store';

describe('PrismaAttendanceCheckInStore.isUsed', () => {
  it('checks both persisted attendance and attempt evidence in parallel', async () => {
    const prisma = {
      attendanceRecord: {
        findFirst: jest.fn().mockResolvedValue({ id: 1 }),
      },
      attendanceAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const store = new PrismaAttendanceCheckInStore(prisma as never);

    await expect(store.isUsed(12, 'device-31', 31)).resolves.toBe(true);

    expect(prisma.attendanceRecord.findFirst).toHaveBeenCalledWith({
      where: {
        sessionId: 12,
        deviceId: 'device-31',
        status: 'present',
        userId: { not: 31 },
      },
      select: { id: true },
    });
    expect(prisma.attendanceAttempt.findFirst).toHaveBeenCalledWith({
      where: {
        sessionId: 12,
        deviceId: 'device-31',
        userId: { not: 31 },
      },
      select: { id: true },
    });
  });
});

describe('PrismaAttendanceCheckInStore.completeAttempt audit trail', () => {
  it('keeps original evidence fields untouched and appends semantic GPS events', async () => {
    const attempt = {
      id: 5,
      sessionId: 12,
      userId: 31,
      latitude: 11.95,
      longitude: 108.44,
      accuracy: 18,
      distanceToCenter: 42,
      deviceId: 'device-31',
      isMockLocation: false,
    };
    const transaction = {
      attendanceAttempt: {
        update: jest.fn().mockResolvedValue(attempt),
      },
      attendanceHistoryEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const store = new PrismaAttendanceCheckInStore(prisma as never);

    await store.completeAttempt(5, 'REVIEW', ['LOW_LOCATION_ACCURACY']);

    expect(transaction.attendanceAttempt.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { result: 'REVIEW', reasons: ['LOW_LOCATION_ACCURACY'] },
      select: { id: true, sessionId: true, userId: true },
    });
    const eventTypes = transaction.attendanceHistoryEvent.create.mock.calls.map(
      ([input]) => input.data.eventType,
    );
    expect(eventTypes).toEqual(['CHECK_IN_ATTEMPT', 'GPS_REVIEW']);
    expect(transaction.attendanceHistoryEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attemptId: 5,
        sessionId: 12,
        userId: 31,
        reasons: ['LOW_LOCATION_ACCURACY'],
      }),
    });
  });
});
