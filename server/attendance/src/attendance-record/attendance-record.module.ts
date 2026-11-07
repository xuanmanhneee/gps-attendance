import { Module } from '@nestjs/common';
import {
  ATTENDANCE_RECORD_BUFFER,
  ATTENDANCE_RECORD_REPOSITORY,
  ATTENDANCE_RECORD_STORE,
} from './attendance-record.token';
import { AttendanceRecordsService } from './attendance-records.service';
import { PrismaAttendanceRecordRepository } from './repositories/prisma-attendance-record.repository';
import { AttendanceRecordController } from './attendance-record.controller';
import { RedisAttendanceRecordBuffer } from './infra/redis/redis-attendance-record-buffer';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AttendanceRecordController],
  providers: [
    AttendanceRecordsService,
    {
      provide: ATTENDANCE_RECORD_BUFFER,
      useClass: RedisAttendanceRecordBuffer,
    },
    {
      provide: ATTENDANCE_RECORD_REPOSITORY,
      useClass: PrismaAttendanceRecordRepository,
    },
  ],
  exports: [
    ATTENDANCE_RECORD_REPOSITORY,
    ATTENDANCE_RECORD_STORE,
    AttendanceRecordsService,
  ],
})
export class AttendanceRecordModule {}
