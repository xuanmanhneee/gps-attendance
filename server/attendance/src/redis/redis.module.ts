// src/redis/redis.module.ts
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
        const port = Number(configService.get<string>('REDIS_PORT') ?? 6379);
        const redis = new Redis({ host, port });
        const logger = new Logger('Redis');

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