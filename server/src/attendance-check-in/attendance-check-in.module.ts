import { Module } from '@nestjs/common';

import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';
import { AttendanceValidationModule } from '../attendance-validation/attendance-validation.module';

import { AttendanceCheckInController } from './attendance-check-in.controller';
import { AttendanceCheckInService } from './attendance-check-in.service';

@Module({
  imports: [
    AttendanceSessionsModule,
    AttendanceValidationModule,
  ],
  controllers: [AttendanceCheckInController],
  providers: [AttendanceCheckInService],
})

export class AttendanceCheckInModule {}