import { Module } from '@nestjs/common';
import { ATTENDANCE_RECORD_STORE } from './attendance-record.token';
import { InMemoryAttendanceRecordStore } from './stores/in-memory-attendance-record.store';

@Module({
  imports: [],

  providers: [
    {
      provide: ATTENDANCE_RECORD_STORE,
      useClass: InMemoryAttendanceRecordStore,
    },
  ],

  exports: [ATTENDANCE_RECORD_STORE],
})
export class AttendanceRecordModule {}
