CREATE TYPE "AttendanceHistoryEventType" AS ENUM (
  'SESSION_ASSIGNED',
  'CHECK_IN_ATTEMPT',
  'REVIEW_DECISION',
  'RECORD_UPDATED'
);

CREATE TABLE "attendance_history_events" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "actor_id" INTEGER,
  "attempt_id" INTEGER,
  "event_type" "AttendanceHistoryEventType" NOT NULL,
  "status" "AttendanceStatus",
  "attempt_result" "AttendanceAttemptResult",
  "reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_history_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attendance_history_events"
  ADD CONSTRAINT "attendance_history_events_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_history_events"
  ADD CONSTRAINT "attendance_history_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_history_events"
  ADD CONSTRAINT "attendance_history_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attendance_history_events"
  ADD CONSTRAINT "attendance_history_events_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "attendance_attempts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "attendance_history_events_user_id_created_at_idx"
  ON "attendance_history_events"("user_id", "created_at");
CREATE INDEX "attendance_history_events_session_id_user_id_created_at_idx"
  ON "attendance_history_events"("session_id", "user_id", "created_at");
CREATE INDEX "attendance_history_events_attempt_id_idx"
  ON "attendance_history_events"("attempt_id");

-- Backfill current attendance rows so existing students do not start with an empty history.
INSERT INTO "attendance_history_events" (
  "session_id", "user_id", "event_type", "status", "note", "created_at"
)
SELECT
  "session_id",
  "user_id",
  CASE WHEN "status" = 'absent' THEN 'SESSION_ASSIGNED'::"AttendanceHistoryEventType"
       ELSE 'RECORD_UPDATED'::"AttendanceHistoryEventType" END,
  "status",
  'Dữ liệu điểm danh hiện có trước khi bật nhật ký sự kiện',
  "updated_at"
FROM "attendance_records";

-- Preserve past accepted/reviewed/rejected GPS attempts and their reasons.
INSERT INTO "attendance_history_events" (
  "session_id", "user_id", "actor_id", "attempt_id", "event_type",
  "status", "attempt_result", "reasons", "note", "created_at"
)
SELECT
  "session_id",
  "user_id",
  "user_id",
  "id",
  'CHECK_IN_ATTEMPT'::"AttendanceHistoryEventType",
  CASE WHEN "result" IN ('APPROVED', 'REVIEW') THEN 'present'::"AttendanceStatus" ELSE NULL END,
  "result",
  "reasons",
  "review_note",
  "server_timestamp"
FROM "attendance_attempts";

INSERT INTO "attendance_history_events" (
  "session_id", "user_id", "actor_id", "attempt_id", "event_type",
  "status", "attempt_result", "reasons", "note", "created_at"
)
SELECT
  "session_id",
  "user_id",
  "reviewed_by",
  "id",
  'REVIEW_DECISION'::"AttendanceHistoryEventType",
  CASE WHEN "result" = 'APPROVED' THEN 'present'::"AttendanceStatus" ELSE NULL END,
  "result",
  "reasons",
  "review_note",
  "reviewed_at"
FROM "attendance_attempts"
WHERE "reviewed_at" IS NOT NULL;
