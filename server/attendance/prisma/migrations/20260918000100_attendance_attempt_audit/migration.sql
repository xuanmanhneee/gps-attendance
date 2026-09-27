CREATE TYPE "AttendanceAttemptResult" AS ENUM ('APPROVED', 'REVIEW', 'REJECTED');

ALTER TABLE "attendance_attempts"
  ADD COLUMN "latitude" DECIMAL(10,7) NOT NULL DEFAULT 0,
  ADD COLUMN "longitude" DECIMAL(10,7) NOT NULL DEFAULT 0,
  ADD COLUMN "accuracy" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN "distance_to_center" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN "device_id" VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN "is_mock_location" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "server_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "result" "AttendanceAttemptResult",
  ADD COLUMN "reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_radius_positive_check" CHECK ("radius" > 0),
  ADD CONSTRAINT "attendance_sessions_latitude_range_check" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "attendance_sessions_longitude_range_check" CHECK ("longitude" BETWEEN -180 AND 180);

ALTER TABLE "attendance_attempts"
  ADD CONSTRAINT "attendance_attempts_latitude_range_check" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "attendance_attempts_longitude_range_check" CHECK ("longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "attendance_attempts_accuracy_range_check" CHECK ("accuracy" BETWEEN 0 AND 30),
  ADD CONSTRAINT "attendance_attempts_distance_non_negative_check" CHECK ("distance_to_center" >= 0);

CREATE INDEX "attendance_attempts_session_id_device_id_created_at_idx"
  ON "attendance_attempts"("session_id", "device_id", "created_at");

CREATE INDEX "attendance_attempts_session_id_user_id_server_timestamp_idx"
  ON "attendance_attempts"("session_id", "user_id", "server_timestamp");