// Client Prisma sinh ra không nạp được trong jest; service chỉ cần token DI.
jest.mock('../../src/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { HealthService } from '../../src/health/health.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { RedisService } from '../../src/redis/redis.service';

describe('HealthService', () => {
  let queryRaw: jest.Mock;
  let ping: jest.Mock;
  let service: HealthService;

  beforeEach(() => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    ping = jest.fn().mockResolvedValue('PONG');
    service = new HealthService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      { ping } as unknown as RedisService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports ok when database and Redis respond', async () => {
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('reports the failing dependency', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).resolves.toEqual({
      status: 'error',
      checks: { database: 'down', redis: 'up' },
    });
  });

  it('marks a dependency down when it does not answer in time', async () => {
    jest.useFakeTimers();
    // ioredis giữ lệnh trong hàng đợi khi mất kết nối: promise không bao giờ xong
    ping.mockReturnValue(new Promise(() => {}));

    const result = service.check();
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toEqual({
      status: 'error',
      checks: { database: 'up', redis: 'down' },
    });
  });
});
