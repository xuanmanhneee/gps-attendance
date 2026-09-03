import { Module } from '@nestjs/common';
import { InMemoryAttendanceRecordStore } from './infra/in-memory-attendance-record.repository';
import {
  ATTEMPT_REPOSITORY,
  ATTENDANCE_RECORD_REPOSITORY,
  DEVICE_USAGE_REPOSITORY,
} from './attendance-record.token';
import { AttendanceRecordsService } from './attendance-records.service';

@Module({
  imports: [],

  providers: [
    InMemoryAttendanceRecordStore,
    AttendanceRecordsService,
    {
      provide: ATTENDANCE_RECORD_REPOSITORY,
      useClass: InMemoryAttendanceRecordStore,
    },

    {
      provide: ATTEMPT_REPOSITORY,
      useExisting: InMemoryAttendanceRecordStore,
    },

    {
      provide: DEVICE_USAGE_REPOSITORY,
      useExisting: InMemoryAttendanceRecordStore,
    },
  ],

  exports: [AttendanceRecordsService],
})
export class AttendanceRecordModule {}
