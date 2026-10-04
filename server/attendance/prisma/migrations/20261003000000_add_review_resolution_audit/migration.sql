ALTER TABLE "attendance_attempts"
  ADD COLUMN "reviewed_by" INTEGER,
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "review_note" VARCHAR(500);

ALTER TABLE "attendance_attempts"
  ADD CONSTRAINT "attendance_attempts_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "attendance_attempts_reviewed_by_idx"
  ON "attendance_attempts"("reviewed_by");
