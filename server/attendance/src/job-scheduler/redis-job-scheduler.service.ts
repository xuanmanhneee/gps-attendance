// job-scheduler/redis-job-scheduler.service.ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { IJobScheduler } from './job-scheduler.interface';
import { JobEnvelope } from './redis-job-scheduler.types';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { RedisService } from '../redis/redis.service';

const INDEX_KEY = 'scheduler:index';
const DATA_KEY = 'scheduler:data';
const lockKeyFor = (id: string) => `scheduler:lock:${id}`;
const TICK_BATCH_SIZE = 50;
const LEASE_MS = 120_000;
const LEASE_RENEWAL_MS = 30_000;
const RETRY_BACKOFF_MS = 60_000;
const MAX_BACKOFF_STEPS = 5;

// Job vẫn ở index/data trong lúc chạy. Nếu process chết, lease hết hạn và
// một worker khác có thể thử lại. Chỉ xóa job sau khi handler thành công.
const CLAIM_SCRIPT = `
  local score = redis.call('ZSCORE', KEYS[1], ARGV[1])
  if not score or tonumber(score) > tonumber(ARGV[3]) then return nil end
  local raw = redis.call('HGET', KEYS[2], ARGV[1])
  if not raw then
    redis.call('ZREM', KEYS[1], ARGV[1])
    return nil
  end
  if not redis.call('SET', KEYS[3], ARGV[2], 'NX', 'PX', ARGV[4]) then return nil end
  return raw
`;

const RENEW_SCRIPT = `
  if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
`;

const ACK_SCRIPT = `
  if redis.call('GET', KEYS[3]) ~= ARGV[2] then return 0 end
  if redis.call('HGET', KEYS[2], ARGV[1]) ~= ARGV[3] then
    redis.call('DEL', KEYS[3])
    return 0
  end
  redis.call('ZREM', KEYS[1], ARGV[1])
  redis.call('HDEL', KEYS[2], ARGV[1])
  redis.call('DEL', KEYS[3])
  return 1
`;

const RETRY_SCRIPT = `
  if redis.call('GET', KEYS[3]) ~= ARGV[2] then return 0 end
  if redis.call('HGET', KEYS[2], ARGV[1]) ~= ARGV[3] then
    redis.call('DEL', KEYS[3])
    return 0
  end
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[4])
  redis.call('ZADD', KEYS[1], ARGV[5], ARGV[1])
  redis.call('DEL', KEYS[3])
  return 1
`;

const RELEASE_SCRIPT = `
  if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
  return redis.call('DEL', KEYS[1])
`;

const SCHEDULE_SCRIPT = `
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
  redis.call('ZADD', KEYS[1], ARGV[3], ARGV[1])
  return 1
`;

const CANCEL_SCRIPT = `
  redis.call('ZREM', KEYS[1], ARGV[1])
  redis.call('HDEL', KEYS[2], ARGV[1])
  return 1
`;

@Injectable()
export class RedisJobSchedulerService implements IJobScheduler {
  private readonly logger: ILogger;
  private readonly handlers = new Map<
    string,
    (payload: any) => Promise<void>
  >();
  private ticking = false; // chặn tick chồng tick nếu 1 lượt xử lý lâu hơn interval

  constructor(
    private readonly redisService: RedisService,
    @Inject(LOGGER_FACTORY) loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(RedisJobSchedulerService.name);
  }

  onJob<T>(type: string, handler: (payload: T) => Promise<void>): void {
    if (this.handlers.has(type)) {
      this.logger.warn(`Handler cho type="${type}" bị ghi đè`);
    }
    this.handlers.set(type, handler);
  }

  async schedule<T>(
    type: string,
    runAt: Date,
    payload: T,
    id?: string,
  ): Promise<void> {
    const jobId = id ?? this.generateId(type);
    const envelope: JobEnvelope<T> = {
      id: jobId,
      type,
      payload,
      attempts: 0,
      generation: randomUUID(),
    };
    await this.redisService.eval(
      SCHEDULE_SCRIPT,
      [INDEX_KEY, DATA_KEY],
      [jobId, JSON.stringify(envelope), String(runAt.getTime())],
    );
  }

  async cancel(id: string): Promise<void> {
    await this.redisService.eval(CANCEL_SCRIPT, [INDEX_KEY, DATA_KEY], [id]);
  }

  @Interval(10_000)
  private async tick(): Promise<void> {
    if (this.ticking) return; // lượt trước chưa xong, bỏ qua để tránh chạy chồng
    this.ticking = true;
    try {
      await this.processDueJobs();
    } catch (err) {
      this.logger.error(
        `Lỗi khi xử lý tick scheduler: ${(err as Error).message}`,
      );
    } finally {
      this.ticking = false;
    }
  }

  private async processDueJobs(): Promise<void> {
    const dueIds = await this.redisService.zrangebyscore(
      INDEX_KEY,
      '-inf',
      Date.now(),
      0,
      TICK_BATCH_SIZE,
    );

    for (const jobId of dueIds) {
      const lockKey = lockKeyFor(jobId);
      const owner = randomUUID();
      const raw = await this.redisService.eval(
        CLAIM_SCRIPT,
        [INDEX_KEY, DATA_KEY, lockKey],
        [jobId, owner, String(Date.now()), String(LEASE_MS)],
      );
      if (typeof raw !== 'string') continue;

      const renewal = setInterval(() => {
        void this.redisService
          .eval(RENEW_SCRIPT, [lockKey], [owner, String(LEASE_MS)])
          .catch((err: Error) =>
            this.logger.error(
              `Không gia hạn được lease job ${jobId}: ${err.message}`,
            ),
          );
      }, LEASE_RENEWAL_MS);
      renewal.unref();

      try {
        const envelope = JSON.parse(raw) as JobEnvelope;
        const handler = this.handlers.get(envelope.type);
        if (!handler) {
          throw new Error(`Không có handler cho type="${envelope.type}"`);
        }
        await handler(envelope.payload);

        const acknowledged = await this.redisService.eval(
          ACK_SCRIPT,
          [INDEX_KEY, DATA_KEY, lockKey],
          [jobId, owner, raw],
        );
        if (acknowledged !== 1) {
          this.logger.warn(
            `Job ${jobId} đã chạy nhưng không thể xác nhận; sẽ thử lại`,
          );
        }
      } catch (err) {
        await this.retry(jobId, owner, raw, err as Error);
      } finally {
        clearInterval(renewal);
        await this.redisService.eval(RELEASE_SCRIPT, [lockKey], [owner]);
      }
    }
  }

  private async retry(
    jobId: string,
    owner: string,
    raw: string,
    err: Error,
  ): Promise<void> {
    let nextRaw = raw;
    let attempts = 1;
    try {
      const envelope = JSON.parse(raw) as JobEnvelope;
      attempts = envelope.attempts + 1;
      nextRaw = JSON.stringify({ ...envelope, attempts });
    } catch {
      // Giữ nguyên payload hỏng để còn điều tra; không xóa job.
    }

    const delay = RETRY_BACKOFF_MS * Math.min(attempts, MAX_BACKOFF_STEPS);
    this.logger.error(
      `Job ${jobId} lỗi lần ${attempts}, thử lại sau ${delay}ms: ${err.message}`,
    );
    await this.redisService.eval(
      RETRY_SCRIPT,
      [INDEX_KEY, DATA_KEY, lockKeyFor(jobId)],
      [jobId, owner, raw, nextRaw, String(Date.now() + delay)],
    );
  }

  private generateId(type: string): string {
    return `${type}:${Date.now()}:${randomUUID()}`;
  }
}
