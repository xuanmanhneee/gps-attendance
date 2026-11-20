// src/redis/redis.module.ts
import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => {
        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = Number(process.env.REDIS_PORT ?? 6370);
        const redis = new Redis({ host, port });
        const logger = new Logger('Redis');

        // ioredis tự reconnect; chỉ cần log lỗi thay vì để sự kiện 'error'
        // không có listener làm tràn log khi Redis tạm thời mất kết nối.
        redis.on('error', (error) => {
          logger.warn(`Redis unavailable at ${host}:${port}: ${error.message}`);
        });

        return redis;
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
