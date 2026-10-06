import { PrismaAttendanceCheckInStore } from './prisma-attendance-check-in.store';

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
