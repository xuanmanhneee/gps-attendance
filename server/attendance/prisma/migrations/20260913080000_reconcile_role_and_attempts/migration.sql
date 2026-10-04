-- Reconcile the original init schemas without recreating shared tables.
CREATE TYPE "Role" AS ENUM ('admin', 'lecturer', 'student');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::text::"Role");

DROP TYPE "UserRole";

CREATE TABLE "attendance_attempts" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_attempts_session_id_user_id_created_at_idx"
  ON "attendance_attempts"("session_id", "user_id", "created_at");

ALTER TABLE "attendance_attempts"
  ADD CONSTRAINT "attendance_attempts_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_attempts"
  ADD CONSTRAINT "attendance_attempts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;