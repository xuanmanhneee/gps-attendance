import { Module } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { UsersModule } from '../users/users.module';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { PrismaAttendanceSessionRepository } from './repositories/prisma-attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
import { GeoModule } from '../geo/geo.module';
import { LecturerLocationVerificationController } from './lecturer-location-verification.controller';
import { LecturerLocationVerificationService } from './lecturer-location-verification.service';

@Module({
  imports: [UsersModule, AttendanceRecordModule, GeoModule],
  controllers: [AttendanceSessionsController, LecturerLocationVerificationController],
  providers: [
    AttendanceSessionsService,
    {
      provide: ATTENDANCE_SESSION_REPOSITORY,
      useClass: PrismaAttendanceSessionRepository,
    },
    AttendanceSessionQueryService,
    LecturerLocationVerificationService,
  ],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
