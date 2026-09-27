// src/redis/redis.service.ts
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS') private readonly redis: Redis) {}

  async setJson(key: string, value: object, ttlSec?: number) {
    const raw = JSON.stringify(value);
    if (ttlSec) await this.redis.set(key, raw, 'EX', ttlSec);
    else await this.redis.set(key, raw);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}