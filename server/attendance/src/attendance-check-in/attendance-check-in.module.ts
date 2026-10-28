import { Module } from '@nestjs/common';

import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';
import { AttendanceValidationModule } from '../attendance-validation/attendance-validation.module';

import { AttendanceCheckInController } from './attendance-check-in.controller';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import {
  ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
} from './attendance-check-in.token';
import { AttemptCheck } from './checks/attempt.check';
import { RedisAttendanceCheckInAttemptRepository } from './infra/redis/redis-attendance-checkin-attempt.repository';

@Module({
  imports: [
    AttendanceSessionsModule,
    AttendanceValidationModule,
    AttendanceRecordModule,
  ],
  providers: [
    AttendanceCheckInService,
    {
      provide: ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY,
      useClass: RedisAttendanceCheckInAttemptRepository,
    },
    AttemptCheck,
  ],

  controllers: [AttendanceCheckInController],
})
export class AttendanceCheckInModule {}
