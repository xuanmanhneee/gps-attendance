import { Module } from '@nestjs/common';
import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';
import { AttendanceValidationModule } from '../attendance-validation/attendance-validation.module';
import { AttendanceCheckInController } from './attendance-check-in.controller';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { PrismaAttendanceCheckInStore } from './infra/prisma/prisma-attendance-check-in.store';
import {
  ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
  ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY,
} from './attendance-check-in.token';
import { AttemptCheck } from './checks/attempt.check';
import { DeviceCheck } from './checks/device.check';
import { AuditLogService } from '../common/audit/audit-log.service';
import { DeviceAttestationService } from '../common/device-attestation/device-attestation.service';
import { DeviceRateLimitGuard } from '../common/guards/device-rate-limit.guard';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    AttendanceSessionsModule,
    AttendanceValidationModule,
    AttendanceRecordModule,
    HealthModule,
  ],
  controllers: [AttendanceCheckInController],
  providers: [
    AttendanceCheckInService,
    PrismaAttendanceCheckInStore,
    {
      provide: ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
      useExisting: PrismaAttendanceCheckInStore,
    },
    {
      provide: ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY,
      useExisting: PrismaAttendanceCheckInStore,
    },
    AttemptCheck,
    DeviceCheck,
    AuditLogService,
    DeviceAttestationService,
    DeviceRateLimitGuard,
    RateLimitService,
  ],
  exports: [AttendanceCheckInService],
})
export class AttendanceCheckInModule {}
