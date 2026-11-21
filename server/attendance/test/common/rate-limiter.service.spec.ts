import { RateLimiterService } from '../../src/common/rate-limit/rate-limiter.service';

describe('RateLimiterService', () => {
  const redis = {
    eval: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
  };
  const service = new RateLimiterService(redis as never);

  beforeEach(() => jest.resetAllMocks());

  it('hit trả về bộ đếm mới và truyền TTL cho script', async () => {
    redis.eval.mockResolvedValue(3);
    await expect(service.hit('k', 60)).resolves.toBe(3);
    expect(redis.eval).toHaveBeenCalledWith(expect.any(String), ['k'], ['60']);
  });

  it('fail-open: Redis lỗi thì hit/peek trả null thay vì ném lỗi', async () => {
    redis.eval.mockRejectedValue(new Error('down'));
    redis.get.mockRejectedValue(new Error('down'));
    await expect(service.hit('k', 60)).resolves.toBeNull();
    await expect(service.peek('k')).resolves.toBeNull();
  });

  it('peek trả 0 khi chưa có khoá', async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.peek('k')).resolves.toBe(0);
  });
});
