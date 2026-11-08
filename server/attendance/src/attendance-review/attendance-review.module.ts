import { Module } from '@nestjs/common';

import { AttendanceRecordModule } from '../attendance-record/attendance-record.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RedisModule } from '../redis/redis.module';
import { AttendanceReviewService } from './attendance-review.service';
import { ATTENDANCE_REVIEW_REPOSITORY } from './attendance-review.repository.token';
import { RedisAttendanceReviewRepository } from './infra/redis/redis-attendance-review.repository';
import { ATTENDANCE_REVIEW_HISTORY_REPOSITORY } from './attendance-review-history.repository.token';
import { AuditLogAttendanceReviewHistoryRepository } from './infra/audit-log/audit-log-attendance-review-history.repository';

@Module({
  imports: [AttendanceRecordModule, RedisModule, AuditLogModule],
  controllers: [],
  providers: [
    AttendanceReviewService,
    {
      provide: ATTENDANCE_REVIEW_REPOSITORY,
      useClass: RedisAttendanceReviewRepository,
    },
    {
      provide: ATTENDANCE_REVIEW_HISTORY_REPOSITORY,
      useClass: AuditLogAttendanceReviewHistoryRepository,
    },
  ],
  exports: [
    AttendanceReviewService,
    ATTENDANCE_REVIEW_REPOSITORY,
    ATTENDANCE_REVIEW_HISTORY_REPOSITORY,
  ],
})
export class AttendanceReviewModule {}
