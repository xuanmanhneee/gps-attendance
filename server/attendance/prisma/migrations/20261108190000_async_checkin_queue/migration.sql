ALTER TABLE "attendance_attempts"
  ADD COLUMN "queue_id" UUID;

CREATE UNIQUE INDEX "attendance_attempts_queue_id_key"
  ON "attendance_attempts"("queue_id");

ALTER TABLE "attendance_history_events"
  ADD COLUMN "source_key" VARCHAR(100);

CREATE UNIQUE INDEX "attendance_history_events_source_key_key"
  ON "attendance_history_events"("source_key");

ALTER TABLE "device_integrity_checks"
  ADD COLUMN "source_key" VARCHAR(100);

CREATE UNIQUE INDEX "device_integrity_checks_source_key_key"
  ON "device_integrity_checks"("source_key");

ALTER TABLE "audit_logs"
  ADD COLUMN "source_key" VARCHAR(100);

CREATE UNIQUE INDEX "audit_logs_source_key_key"
  ON "audit_logs"("source_key");
