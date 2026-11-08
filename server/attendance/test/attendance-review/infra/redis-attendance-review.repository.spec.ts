import { RedisAttendanceReviewRepository } from '../../../src/attendance-review/infra/redis/redis-attendance-review.repository';
import { RedisService } from '../../../src/redis/redis.service';

describe('RedisAttendanceReviewRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  const candidate = {
    sessionId: 4,
    userId: 9,
    reasons: ['LOW_CONFIDENCE_SCORE'] as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('ghi candidate và TTL qua repository abstraction', async () => {
    const redis = {
      eval: jest.fn().mockResolvedValue(1),
    } as unknown as RedisService;
    const repository = new RedisAttendanceReviewRepository(redis);

    await repository.upsert(
      { ...candidate, reasons: [...candidate.reasons] },
      new Date(Date.now() + 600_000),
    );

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('EXPIRE', KEYS[1], ARGV[3])"),
      ['attendance:review:4'],
      ['9', expect.stringContaining('LOW_CONFIDENCE_SCORE'), '600'],
    );
  });

  it('deserialize createdAt khi đọc candidate', async () => {
    const redis = {
      hget: jest.fn().mockResolvedValue(JSON.stringify(candidate)),
    } as unknown as RedisService;
    const repository = new RedisAttendanceReviewRepository(redis);

    const result = await repository.find(4, 9);

    expect(result).toMatchObject({ sessionId: 4, userId: 9 });
    expect(result?.createdAt).toBeInstanceOf(Date);
  });

  it('cập nhật expiry của candidate khi closeAt thay đổi', async () => {
    const redis = {
      expire: jest.fn().mockResolvedValue(1),
    } as unknown as RedisService;
    const repository = new RedisAttendanceReviewRepository(redis);

    const now = new Date('2026-01-01T00:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await repository.updateSessionExpiry(4, new Date(now + 900_000));

    expect(redis.expire).toHaveBeenCalledWith('attendance:review:4', 900);
  });

  it('clear chỉ xóa key thuộc review repository', async () => {
    const redis = {
      del: jest.fn().mockResolvedValue(1),
    } as unknown as RedisService;
    const repository = new RedisAttendanceReviewRepository(redis);

    await repository.clearSession(4);

    expect(redis.del).toHaveBeenCalledWith('attendance:review:4');
  });
});
