// src/redis/redis.service.ts
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS') private readonly redis: Redis) {}

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

  async del(key: string): Promise<number> {
    try {
      return this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Redis del error for key ${key}: ${(err as Error).message}`);
      return 0;
    }
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

  async setJson(key: string, value: object, ttlSec?: number) {
    try {
      const raw = JSON.stringify(value);
      if (ttlSec) await this.redis.set(key, raw, 'EX', ttlSec);
      else await this.redis.set(key, raw);
    } catch (err) {
      this.logger.warn(`Redis setJson error for key ${key}: ${(err as Error).message}`);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Redis getJson error for key ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async setBlacklistToken(
    token: string,
    ttlSec = 86400,
    namespace: 'token' | 'jti' | 'session' = 'token',
  ): Promise<void> {
    try {
      await this.redis.set(`bl:${namespace}:${token}`, '1', 'EX', ttlSec);
    } catch (err) {
      this.logger.warn(`Failed to blacklist token in Redis: ${(err as Error).message}`);
    }
  }

  async isTokenBlacklisted(
    token: string,
    namespace: 'token' | 'jti' | 'session' = 'token',
  ): Promise<boolean> {
    try {
      const exists = await this.redis.exists(`bl:${namespace}:${token}`);
      return exists === 1;
    } catch (err) {
      this.logger.warn(`Failed to check token blacklist in Redis: ${(err as Error).message}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      // ignore
    }
  }
}
