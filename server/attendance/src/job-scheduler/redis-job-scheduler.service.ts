// job-scheduler/redis-job-scheduler.service.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import Redis from 'ioredis';

import { IJobScheduler } from './job-scheduler.interface';
import { JobEnvelope } from './redis-job-scheduler.types';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { Inject } from '@nestjs/common';

const INDEX_KEY = 'scheduler:index'; // ZSET: member = job id, score = runAt (epoch ms)
const DATA_KEY = 'scheduler:data'; // HASH: field = job id, value = JobEnvelope JSON
const TICK_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = 60_000; // retry cố định 1 phút; đủ dùng cho quy mô hiện tại

@Injectable()
export class RedisJobSchedulerService
  implements IJobScheduler, OnApplicationBootstrap
{
  private readonly logger: ILogger;
  private readonly handlers = new Map<
    string,
    (payload: any) => Promise<void>
  >();
  private ticking = false; // chặn tick chồng tick nếu 1 lượt xử lý lâu hơn interval

  constructor(
    private readonly redis: Redis,
    @Inject(LOGGER_FACTORY) loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(RedisJobSchedulerService.name);
  }

  onApplicationBootstrap() {
    this.logger.log('RedisJobSchedulerService started');
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
    const envelope: JobEnvelope<T> = { id: jobId, type, payload, attempts: 0 };

    // HSET trước, ZADD sau: nếu crash giữa 2 lệnh, index không trỏ tới data rác (tick sẽ tự bỏ qua vì HGET null)
    await this.redis.hset(DATA_KEY, jobId, JSON.stringify(envelope));
    await this.redis.zadd(INDEX_KEY, runAt.getTime(), jobId);
  }

  async cancel(id: string): Promise<void> {
    await this.redis.zrem(INDEX_KEY, id);
    await this.redis.hdel(DATA_KEY, id);
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
    const dueIds = await this.redis.zrangebyscore(
      INDEX_KEY,
      '-inf',
      Date.now(),
      'LIMIT',
      0,
      TICK_BATCH_SIZE,
    );

    for (const jobId of dueIds) {
      // ZREM atomic: instance nào rem thành công (=1) mới được xử lý, instance khác nhận 0 và bỏ qua
      const removed = await this.redis.zrem(INDEX_KEY, jobId);
      if (removed === 0) continue;

      const raw = await this.redis.hget(DATA_KEY, jobId);
      await this.redis.hdel(DATA_KEY, jobId);
      if (!raw) continue; // job đã bị cancel giữa lúc zrangebyscore và zrem

      await this.runJob(JSON.parse(raw) as JobEnvelope);
    }
  }

  private async runJob(envelope: JobEnvelope): Promise<void> {
    const handler = this.handlers.get(envelope.type);
    if (!handler) {
      this.logger.warn(
        `Không có handler cho type="${envelope.type}", bỏ qua job id=${envelope.id}`,
      );
      return;
    }

    try {
      await handler(envelope.payload);
    } catch (err) {
      await this.retryOrDrop(envelope, err as Error);
    }
  }

  private async retryOrDrop(envelope: JobEnvelope, err: Error): Promise<void> {
    const attempts = envelope.attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      this.logger.error(
        `Job id=${envelope.id} type=${envelope.type} fail sau ${attempts} lần, dừng retry: ${err.message}`,
      );
      return; // dead-letter đơn giản: chỉ log, không tự động xoá đâu hết vì đã hdel/zrem trước đó rồi
    }

    this.logger.warn(
      `Job id=${envelope.id} type=${envelope.type} fail lần ${attempts}, retry sau ${RETRY_BACKOFF_MS}ms: ${err.message}`,
    );

    const retryEnvelope: JobEnvelope = { ...envelope, attempts };
    const retryAt = Date.now() + RETRY_BACKOFF_MS;

    await this.redis.hset(DATA_KEY, envelope.id, JSON.stringify(retryEnvelope));
    await this.redis.zadd(INDEX_KEY, retryAt, envelope.id);
  }

  private generateId(type: string): string {
    return `${type}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  }
}
