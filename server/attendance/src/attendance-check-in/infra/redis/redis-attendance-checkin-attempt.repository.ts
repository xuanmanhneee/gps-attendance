// redis-attendance-checkin-attempt.repository.ts
import { Injectable } from '@nestjs/common';

import { IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import { RedisService } from '#redis/redis.service'; // chỉnh path đúng theo project

const keyFor = (sessionId: number, userId: number) =>
  `attendance:attempt:${sessionId}:${userId}`;

const SAFETY_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class RedisAttendanceCheckInAttemptRepository implements IAttendanceCheckInAttemptRepository {
  constructor(private readonly redisService: RedisService) {} // đổi từ Redis sang RedisService

  async incrementAttempt(sessionId: number, userId: number): Promise<number> {
    const key = keyFor(sessionId, userId);
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, SAFETY_TTL_SECONDS);
    return count;
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    const raw = await this.redisService.get(keyFor(sessionId, userId));
    return raw ? Number(raw) : 0;
  }

  async resetAttempts(sessionId: number, userId: number): Promise<void> {
    await this.redisService.del(keyFor(sessionId, userId));
  }
}
