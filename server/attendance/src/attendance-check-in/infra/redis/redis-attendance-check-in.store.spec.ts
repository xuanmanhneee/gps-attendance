import { RedisAttendanceCheckInStore } from './redis-attendance-check-in.store';

describe('RedisAttendanceCheckInStore', () => {
  it('creates a Redis-backed attempt and finalizes it for asynchronous persistence', async () => {
    const redis = {
      eval: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
    };
    const store = new RedisAttendanceCheckInStore(redis as never, {} as never);
    const input = {
      sessionId: 8,
      userId: 24,
      latitude: 11.95,
      longitude: 108.44,
      accuracy: 10,
      distanceToCenter: 20,
      deviceId: 'device-24',
      isMockLocation: false,
      platform: 'android',
      model: 'Pixel',
    };

    const attempt = await store.createAttempt(input);
    await store.completeAttempt(attempt.id, 'REVIEW', ['DEVICE_UNVERIFIED']);

    expect(attempt.count).toBe(2);
    expect(redis.eval).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("redis.call('INCR'"),
      [
        'attendance:attempts:count:8:24',
        'attendance:attempts:pending',
        'attendance:attempts:pending-index',
      ],
      [
        '120000',
        attempt.id,
        JSON.stringify({ input }),
        expect.any(String),
        expect.any(String),
      ],
    );
    expect(redis.eval).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("redis.call('ZADD', KEYS[3]"),
      [
        'attendance:attempts:pending',
        'attendance:attempts:pending-index',
        'attendance:attempts:queue',
      ],
      [
        attempt.id,
        'REVIEW',
        JSON.stringify(['DEVICE_UNVERIFIED']),
        expect.any(String),
      ],
    );
  });

  it('batch-persists completed attempts before acknowledging them in Redis', async () => {
    const attemptId = 'c8c0b9cf-34d6-4b6c-8738-c34543901739';
    const queuedAttempt = {
      id: attemptId,
      input: {
        sessionId: 8,
        userId: 24,
        latitude: 11.95,
        longitude: 108.44,
        accuracy: 10,
        distanceToCenter: 20,
        deviceId: 'device-24',
        isMockLocation: false,
        platform: 'android',
        model: 'Pixel',
      },
      createdAt: '2026-11-08T19:00:00.000Z',
      result: 'APPROVED',
      reasonsJson: '[]',
      attestationJson: JSON.stringify({
        provider: 'PLAY_INTEGRITY',
        verdict: 'PLAY_INTEGRITY_VERIFIED',
        reasons: [],
      }),
    };
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
      zrangebyscore: jest.fn().mockResolvedValue([attemptId]),
      hget: jest.fn().mockResolvedValue(JSON.stringify(queuedAttempt)),
    };
    const prisma = {
      registeredDevice: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 44, userId: 24, deviceId: 'device-24' },
        ]),
      },
      attendanceAttempt: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 91, queueId: attemptId, sessionId: 8, userId: 24 },
        ]),
      },
      attendanceHistoryEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      deviceIntegrityCheck: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const store = new RedisAttendanceCheckInStore(redis as never, prisma as never);

    await store.flushQueuedAttempts();

    expect(prisma.attendanceAttempt.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            queueId: attemptId,
            sessionId: 8,
            userId: 24,
            result: 'APPROVED',
            reasons: [],
          }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(prisma.registeredDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ userId: 24, deviceId: 'device-24' }],
        },
        data: expect.objectContaining({
          platform: 'android',
          model: 'Pixel',
        }),
      }),
    );
    expect(prisma.attendanceHistoryEvent.createMany).toHaveBeenCalled();
    expect(prisma.deviceIntegrityCheck.createMany).toHaveBeenCalled();
    expect(prisma.auditLog.createMany).toHaveBeenCalled();

    const redisScripts = redis.eval.mock.calls.map(([script]) => script);
    const acknowledgeIndex = redisScripts.findIndex((script) =>
      script.includes("redis.call('HDEL'"),
    );
    const releaseIndex = redisScripts.findIndex((script) =>
      script.includes("redis.call('GET', KEYS[1])"),
    );
    expect(acknowledgeIndex).toBeGreaterThan(0);
    expect(releaseIndex).toBeGreaterThan(acknowledgeIndex);
  });
});
