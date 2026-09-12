import { Module } from '@nestjs/common';
import { ATTENDANCE_RECORD_STORE } from './attendance-record.token';
import { AttendanceRecordsService } from './attendance-records.service';
import { PrismaAttendanceRecordStore } from './prisma-attendance-record.store';

import { AttendanceRecordController } from './attendance-record.controller';

@Module({
  imports: [],
  controllers: [AttendanceRecordController],
  providers: [
    AttendanceRecordsService,
    {
      provide: ATTENDANCE_RECORD_STORE,
      useClass: PrismaAttendanceRecordStore,
    },
  ],
  exports: [ATTENDANCE_RECORD_STORE, AttendanceRecordsService],
})
export class AttendanceRecordModule {}
