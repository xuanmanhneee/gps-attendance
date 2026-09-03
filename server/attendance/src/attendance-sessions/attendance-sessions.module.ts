import { Module } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { GeoModule } from '../geo/geo.module';
import { UsersModule } from '../users/users.module';
import { LoggingModule } from '../common/logging/logging.module';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { InMemoryAttendanceSessionRepository } from './repository/in-memory-attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { AttendanceSessionSeeder } from './attendance-session.seeder';

@Module({
  imports: [UsersModule, GeoModule, AttendanceRecordModule, LoggingModule],

  controllers: [AttendanceSessionsController],
  providers: [
    AttendanceSessionsService,
    AttendanceSessionSeeder,
    {
      provide: ATTENDANCE_SESSION_REPOSITORY,
      useClass: InMemoryAttendanceSessionRepository,
    },
  ],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
