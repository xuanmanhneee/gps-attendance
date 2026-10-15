// src/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => new Redis({ host: 'localhost', port: 6370 }),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
