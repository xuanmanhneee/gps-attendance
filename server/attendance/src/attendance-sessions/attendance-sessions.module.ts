import { Module } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { GeoModule } from '../geo/geo.module';
import { UsersModule } from '../users/users.module';
import { LoggingModule } from '../common/logging/logging.module';
import { ATTENDANCE_RECORD_STORE } from '../attendance-record/attendance-record.token';
import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';

@Module({
  imports: [UsersModule, GeoModule, AttendanceRecordModule],
  controllers: [AttendanceSessionsController],
  providers: [AttendanceSessionsService],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
