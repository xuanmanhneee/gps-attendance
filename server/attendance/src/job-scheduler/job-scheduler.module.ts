import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { JOB_SCHEDULER } from './job-scheduler.token';
import { RedisJobSchedulerService } from './redis-job-scheduler.service';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  providers: [
    RedisJobSchedulerService,
    {
      provide: JOB_SCHEDULER,
      useExisting: RedisJobSchedulerService,
    },
  ],
  exports: [JOB_SCHEDULER],
})
export class JobSchedulerModule {}