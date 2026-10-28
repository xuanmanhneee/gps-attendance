// src/redis/redis.service.ts
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject('REDIS')
    private readonly redis: Redis,
  ) {}

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  set(
    key: string,
    value: string,
    options?: { ttlSec?: number; ifNotExists?: boolean },
  ): Promise<string | null> {
    const { ttlSec, ifNotExists } = options ?? {};

    if (ttlSec !== undefined && ifNotExists) {
      return this.redis.set(key, value, 'EX', ttlSec, 'NX');
    }
    if (ttlSec !== undefined) {
      return this.redis.set(key, value, 'EX', ttlSec);
    }
    if (ifNotExists) {
      return this.redis.set(key, value, 'NX');
    }
    return this.redis.set(key, value);
  }

  del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  exists(key: string): Promise<number> {
    return this.redis.exists(key);
  }

  expire(key: string, ttlSec: number): Promise<number> {
    return this.redis.expire(key, ttlSec);
  }

  ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  hset(key: string, field: string, value: string): Promise<number> {
    return this.redis.hset(key, field, value);
  }

  hsetnx(key: string, field: string, value: string): Promise<number> {
    return this.redis.hsetnx(key, field, value);
  }

  hdel(key: string, field: string): Promise<number> {
    return this.redis.hdel(key, field);
  }

  hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    return this.redis.eval(script, keys.length, ...keys, ...args);
  }

  scan(
    cursor: string,
    matchPattern: string,
    count: number,
  ): Promise<[string, string[]]> {
    return this.redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', count);
  }

  zadd(key: string, score: number, member: string): Promise<number> {
    return this.redis.zadd(key, score, member);
  }

  zrem(key: string, member: string): Promise<number> {
    return this.redis.zrem(key, member);
  }

  zrangebyscore(
    key: string,
    min: number | '-inf',
    max: number | '+inf',
    limitOffset: number,
    limitCount: number,
  ): Promise<string[]> {
    return this.redis.zrangebyscore(
      key,
      min,
      max,
      'LIMIT',
      limitOffset,
      limitCount,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
