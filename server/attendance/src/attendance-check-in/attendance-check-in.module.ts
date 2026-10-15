import { Module } from '@nestjs/common';

import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';
import { AttendanceValidationModule } from '../attendance-validation/attendance-validation.module';

import { AttendanceCheckInController } from './attendance-check-in.controller';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { InMemoryAttendanceCheckInStore } from './infra/in-memory/in-memory-attendance-check-in.store';
import {
  ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
  ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY,
} from './attendance-check-in.token';
import { AttemptCheck } from './checks/attempt.check';
import { DeviceCheck } from './checks/device.check';
import { RedisAttendanceCheckInAttemptRepository } from './infra/redis/redis-attendance-checkin-attempt.repository';
import { RedisAttendanceCheckInDeviceUsageRepository } from './infra/redis/redis-attendance-checkin-device-usage.repository';

@Module({
  imports: [
    AttendanceSessionsModule,
    AttendanceValidationModule,
    AttendanceRecordModule,
  ],
  providers: [
    AttendanceCheckInService,
    InMemoryAttendanceCheckInStore,
    {
      provide: ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
      useClass: RedisAttendanceCheckInAttemptRepository,
    },
    {
      provide: ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY,
      useClass: RedisAttendanceCheckInDeviceUsageRepository,
    },
    AttemptCheck,
    DeviceCheck,
  ],

  controllers: [AttendanceCheckInController],
})
export class AttendanceCheckInModule {}
