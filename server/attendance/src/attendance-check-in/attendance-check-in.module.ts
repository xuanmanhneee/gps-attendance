import { Module } from '@nestjs/common';
import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';
import { AttendanceValidationModule } from '../attendance-validation/attendance-validation.module';
import { AttendanceCheckInController } from './attendance-check-in.controller';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { RedisAttendanceCheckInStore } from './infra/redis/redis-attendance-check-in.store';
import {
  ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
  ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY,
} from './attendance-check-in.token';
import { AttemptCheck } from './checks/attempt.check';
import { DeviceCheck } from './checks/device.check';
import { DeviceAttestationService } from '../common/device-attestation/device-attestation.service';
import { DeviceRateLimitGuard } from '../common/guards/device-rate-limit.guard';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { HealthModule } from '../health/health.module';
import { LocationTimestampCheck } from '../attendance-validation/checks/location-timestamp.check';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    AttendanceSessionsModule,
    AttendanceValidationModule,
    AttendanceRecordModule,
    HealthModule,
    RedisModule,
  ],
  controllers: [AttendanceCheckInController],
  providers: [
    AttendanceCheckInService,
    RedisAttendanceCheckInStore,
    {
      provide: ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
      useExisting: RedisAttendanceCheckInStore,
    },
    {
      provide: ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY,
      useExisting: RedisAttendanceCheckInStore,
    },
    AttemptCheck,
    DeviceCheck,
    LocationTimestampCheck,
    DeviceAttestationService,
    DeviceRateLimitGuard,
    RateLimitService,
  ],
  exports: [AttendanceCheckInService],
})
export class AttendanceCheckInModule {}
