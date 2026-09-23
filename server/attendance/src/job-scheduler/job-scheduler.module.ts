// job-scheduler/job-scheduler.module.ts
import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import Redis from 'ioredis';

import { JOB_SCHEDULER } from './job-scheduler.token';
import { RedisJobSchedulerService } from './redis-job-scheduler.service';
import { REDIS_CLIENT, redisClientProvider } from './redis-client.provider';
import { LOGGER_FACTORY } from '#common/logging/logger.token';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    redisClientProvider,
    {
      provide: JOB_SCHEDULER,
      useFactory: (redis: Redis, loggerFactory: any) =>
        new RedisJobSchedulerService(redis, loggerFactory),
      inject: [REDIS_CLIENT, LOGGER_FACTORY], // thay 'LOGGER_FACTORY' bằng đúng token LOGGER_FACTORY trong codebase của bạn
    },
  ],
  exports: [JOB_SCHEDULER],
})
export class JobSchedulerModule {}
