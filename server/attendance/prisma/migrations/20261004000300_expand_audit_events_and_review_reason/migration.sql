ALTER TYPE "AttendanceHistoryEventType" ADD VALUE IF NOT EXISTS 'SESSION_CREATED';
ALTER TYPE "AttendanceHistoryEventType" ADD VALUE IF NOT EXISTS 'GPS_VALIDATED';
ALTER TYPE "AttendanceHistoryEventType" ADD VALUE IF NOT EXISTS 'GPS_REVIEW';
ALTER TYPE "AttendanceHistoryEventType" ADD VALUE IF NOT EXISTS 'GPS_REJECTED';
ALTER TYPE "AttendanceHistoryEventType" ADD VALUE IF NOT EXISTS 'DEVICE_REJECTED';
ALTER TYPE "AttendanceHistoryEventType" ADD VALUE IF NOT EXISTS 'ATTEMPT_REJECTED';

ALTER TABLE "attendance_attempts"
  ADD COLUMN "review_reason" VARCHAR(50);

ALTER TABLE "attendance_history_events"
  ADD COLUMN "review_reason" VARCHAR(50);
