import { Module } from '@nestjs/common';
import { ATTENDANCE_RECORD_STORE } from './attendance-record.token';
import { InMemoryAttendanceRecordStore } from './stores/in-memory-attendance-record.store';
import { AttendanceRecordsService } from './attendance-records.service';

@Module({
  imports: [],

  providers: [
    AttendanceRecordsService,
    {
      provide: ATTENDANCE_RECORD_STORE,
      useClass: InMemoryAttendanceRecordStore,
    },
  ],

  exports: [ATTENDANCE_RECORD_STORE, AttendanceRecordsService],
})
export class AttendanceRecordModule {}
