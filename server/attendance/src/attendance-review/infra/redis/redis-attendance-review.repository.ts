import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../redis/redis.service';
import type { AttendanceReviewCandidate } from '../../attendance-review.model';
import type { IAttendanceReviewRepository } from '../../attendance-review.repository';

const reviewKeyFor = (sessionId: number) => `attendance:review:${sessionId}`;

const UPSERT_WITH_TTL_SCRIPT = `
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1
`;

@Injectable()
export class RedisAttendanceReviewRepository implements IAttendanceReviewRepository {
  constructor(private readonly redisService: RedisService) {}

  async upsert(
    candidate: AttendanceReviewCandidate,
    expiresAt: Date,
  ): Promise<void> {
    await this.redisService.eval(
      UPSERT_WITH_TTL_SCRIPT,
      [reviewKeyFor(candidate.sessionId)],
      [
        String(candidate.userId),
        JSON.stringify(candidate),
        String(
          Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
        ),
      ],
    );
  }

  async find(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceReviewCandidate | null> {
    const raw = await this.redisService.hget(
      reviewKeyFor(sessionId),
      String(userId),
    );

    return raw ? this.deserialize(raw) : null;
  }

  async findBySession(sessionId: number): Promise<AttendanceReviewCandidate[]> {
    const candidates = await this.redisService.hgetall(reviewKeyFor(sessionId));

    return Object.values(candidates).map((raw) => this.deserialize(raw));
  }

  async updateSessionExpiry(sessionId: number, expiresAt: Date): Promise<void> {
    await this.redisService.expire(
      reviewKeyFor(sessionId),
      Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
    );
  }

  async delete(sessionId: number, userId: number): Promise<void> {
    await this.redisService.hdel(reviewKeyFor(sessionId), String(userId));
  }

  async clearSession(sessionId: number): Promise<void> {
    await this.redisService.del(reviewKeyFor(sessionId));
  }

  private deserialize(raw: string): AttendanceReviewCandidate {
    const parsed = JSON.parse(raw) as Omit<
      AttendanceReviewCandidate,
      'createdAt'
    > & { createdAt: string };

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
    };
  }
}
