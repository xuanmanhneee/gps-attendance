import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly redisService: RedisService) {}

  async allowRequest(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetInSec: number;
    current: number;
  }> {
    const bucketKey = `rate_limit:${key}`;
    const current = await this.redisService.incr(bucketKey);
    if (current === 1) {
      await this.redisService.expire(bucketKey, ttlSeconds);
    }

    const ttl = await this.redisService.ttl(bucketKey);
    const remaining = Math.max(limit - current, 0);

    return {
      allowed: current <= limit,
      remaining,
      resetInSec: Math.max(ttl, 0),
      current,
    };
  }
}
