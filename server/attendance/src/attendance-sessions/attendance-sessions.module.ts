import { Module } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { UsersModule } from '../users/users.module';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { InMemoryAttendanceSessionRepository } from './repository/in-memory-attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { AttendanceSessionQueryService } from './attendance-session-query.service';

@Module({
  imports: [UsersModule, AttendanceRecordModule],
  controllers: [AttendanceSessionsController],
  providers: [
    AttendanceSessionsService,
    {
      provide: ATTENDANCE_SESSION_REPOSITORY,
      useClass: InMemoryAttendanceSessionRepository,
    },
    AttendanceSessionQueryService,
  ],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
