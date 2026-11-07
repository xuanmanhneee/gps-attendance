import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

import { RedisService } from '../redis/redis.service';
import { RedisJobSchedulerService } from './redis-job-scheduler.service';

jest.mock('@nestjs/schedule', () => ({ Interval: () => () => undefined }));

const testUrl = process.env.REDIS_SCHEDULER_TEST_URL;
const describeWithRedis = testUrl ? describe : describe.skip;

describeWithRedis('RedisJobSchedulerService (Redis integration)', () => {
  let redis: Redis;
  let scheduler: RedisJobSchedulerService;
  let jobId: string;

  const processDueJobs = (target: RedisJobSchedulerService) =>
    (target as unknown as { processDueJobs: () => Promise<void> }).processDueJobs();

  beforeAll(async () => {
    redis = new Redis(testUrl!);
    await redis.ping();
    if ((await redis.dbsize()) !== 0) {
      throw new Error('Redis test database phải trống để không đụng dữ liệu khác');
    }
  });

  beforeEach(() => {
    jobId = `scheduler-test:${randomUUID()}`;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    scheduler = new RedisJobSchedulerService(
      new RedisService(redis),
      { create: () => logger } as never,
    );
  });

  afterEach(async () => {
    await redis.del('scheduler:index', 'scheduler:data', `scheduler:lock:${jobId}`);
  });

  afterAll(async () => {
    await redis?.quit();
  });

  it('giữ job khi handler lỗi và chỉ xóa sau khi chạy lại thành công', async () => {
    let calls = 0;
    scheduler.onJob('attendance:flush', async () => {
      calls += 1;
      if (calls === 1) throw new Error('PostgreSQL tạm thời lỗi');
      expect(await redis.hget('scheduler:data', jobId)).not.toBeNull();
    });
    await scheduler.schedule('attendance:flush', new Date(0), { sessionId: 1 }, jobId);

    await processDueJobs(scheduler);
    expect(calls).toBe(1);
    expect(await redis.hget('scheduler:data', jobId)).not.toBeNull();
    expect(await redis.zscore('scheduler:index', jobId)).not.toBeNull();

    await redis.zadd('scheduler:index', Date.now() - 1, jobId);
    await processDueJobs(scheduler);
    expect(calls).toBe(2);
    expect(await redis.hget('scheduler:data', jobId)).toBeNull();
    expect(await redis.zscore('scheduler:index', jobId)).toBeNull();
  });

  it('không xóa job mới được lên lịch lại khi handler cũ vừa xong', async () => {
    let releaseFirst!: () => void;
    let signalStart!: () => void;
    const started = new Promise<void>((resolve) => { signalStart = resolve; });
    const blocked = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const seen: number[] = [];
    scheduler.onJob<{ sessionId: number }>('attendance:flush', async ({ sessionId }) => {
      seen.push(sessionId);
      if (sessionId === 1) {
        signalStart();
        await blocked;
      }
    });
    await scheduler.schedule('attendance:flush', new Date(0), { sessionId: 1 }, jobId);

    const firstRun = processDueJobs(scheduler);
    await started;
    await scheduler.schedule('attendance:flush', new Date(0), { sessionId: 2 }, jobId);
    releaseFirst();
    await firstRun;
    expect(await redis.hget('scheduler:data', jobId)).not.toBeNull();

    await processDueJobs(scheduler);
    expect(seen).toEqual([1, 2]);
    expect(await redis.hget('scheduler:data', jobId)).toBeNull();
  });

  it('chỉ một worker nhận job khi hai worker cùng quét', async () => {
    let release!: () => void;
    let signalStart!: () => void;
    const started = new Promise<void>((resolve) => { signalStart = resolve; });
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const handler = jest.fn(async () => {
      signalStart();
      await blocked;
    });
    const secondWorker = new RedisJobSchedulerService(
      new RedisService(redis),
      { create: () => ({ log: jest.fn(), warn: jest.fn(), error: jest.fn() }) } as never,
    );
    scheduler.onJob('attendance:flush', handler);
    secondWorker.onJob('attendance:flush', handler);
    await scheduler.schedule('attendance:flush', new Date(0), { sessionId: 1 }, jobId);

    const firstRun = processDueJobs(scheduler);
    await started;
    await processDueJobs(secondWorker);
    expect(handler).toHaveBeenCalledTimes(1);
    release();
    await firstRun;
    expect(await redis.hget('scheduler:data', jobId)).toBeNull();
  });
});
