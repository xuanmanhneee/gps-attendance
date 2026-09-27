-- GPS indoor/emulator thường báo accuracy > 30m.
-- Sai số là độ tin cậy, không phải khoảng cách; không được chặn ghi attempt vì ngưỡng 30m.

ALTER TABLE "attendance_attempts"
  DROP CONSTRAINT IF EXISTS "attendance_attempts_accuracy_range_check";

ALTER TABLE "attendance_attempts"
  ADD CONSTRAINT "attendance_attempts_accuracy_range_check"
  CHECK ("accuracy" BETWEEN 0 AND 1000);
