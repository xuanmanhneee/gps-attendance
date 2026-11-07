import { RedisService } from '#redis/redis.service';

import { RedisAttendanceCheckInAttemptRepository } from './redis-attendance-checkin-attempt.repository';

describe('RedisAttendanceCheckInAttemptRepository', () => {
  it('records an attempt in the sliding window atomically', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(1),
    } as unknown as RedisService;
    const repository = new RedisAttendanceCheckInAttemptRepository(redisService);

    await expect(repository.tryRecordAttempt(4, 9, 3, 120)).resolves.toBe(true);
    expect(redisService.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('ZREMRANGEBYSCORE'"),
      ['attendance:attempt-window:v2:4:9'],
      ['120000', '3'],
    );
  });

  it('rejects when the rolling window is already full', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(0),
    } as unknown as RedisService;
    const repository = new RedisAttendanceCheckInAttemptRepository(redisService);

    await expect(repository.tryRecordAttempt(4, 9, 3, 120)).resolves.toBe(
      false,
    );
  });
});
