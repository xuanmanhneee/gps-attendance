import { Module } from '@nestjs/common';
import { InMemoryAttendanceRecordStore } from './infra/in-memory-attendance-record.repository';
import {
  ATTEMPT_REPOSITORY,
  ATTENDANCE_RECORD_BUFFER,
  ATTENDANCE_RECORD_REPOSITORY,
  DEVICE_USAGE_REPOSITORY,
} from './attendance-record.token';
import { AttendanceRecordsService } from './attendance-records.service';
import { JOB_SCHEDULER } from '#job-scheduler/job-scheduler.token';
import { PrismaAttendanceRecordRepository } from './infra/redis/prisma-attendance-record.repository';
import { RedisAttendanceCheckInAttemptRepository } from '#attendance-check-in/infra/redis/redis-attendance-checkin-attempt.repository';
import { RedisAttendanceCheckInDeviceUsageRepository } from '#attendance-check-in/infra/redis/redis-attendance-checkin-device-usage.repository';
import { RedisAttendanceRecordBuffer } from './infra/redis/redis-attendance-record-buffer';
import { RedisModule } from '#redis/redis.module';
import { JobSchedulerModule } from '#job-scheduler/job-scheduler.module';

@Module({
  imports: [RedisModule, JobSchedulerModule],

  providers: [
    InMemoryAttendanceRecordStore,
    AttendanceRecordsService,
    {
      provide: ATTENDANCE_RECORD_REPOSITORY,
      useClass: PrismaAttendanceRecordRepository,
    },

    {
      provide: ATTENDANCE_RECORD_BUFFER,
      useClass: RedisAttendanceRecordBuffer,
    },

    {
      provide: ATTEMPT_REPOSITORY,
      useClass: RedisAttendanceCheckInAttemptRepository,
    },

    {
      provide: DEVICE_USAGE_REPOSITORY,
      useClass: RedisAttendanceCheckInDeviceUsageRepository,
    },
  ],

  exports: [AttendanceRecordsService],
})
export class AttendanceRecordModule {}
