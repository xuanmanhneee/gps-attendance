import { Module } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { GeoModule } from '../geo/geo.module';
import { UsersModule } from '../users/users.module';
import { LoggingModule } from '../common/logging/logging.module';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
import { PrismaAttendanceSessionRepository } from './infra/prisma/prisma-attendance-session.repository';

@Module({
  imports: [UsersModule, GeoModule, AttendanceRecordModule, LoggingModule],

  controllers: [AttendanceSessionsController],
  providers: [
    AttendanceSessionsService,
    {
      provide: ATTENDANCE_SESSION_REPOSITORY,
      useClass: PrismaAttendanceSessionRepository,
    },
    AttendanceSessionQueryService
  ],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
