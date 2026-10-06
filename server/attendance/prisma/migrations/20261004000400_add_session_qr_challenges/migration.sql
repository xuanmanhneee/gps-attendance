CREATE TABLE "session_qr_challenges" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "issued_by" INTEGER NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_qr_challenges_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attendance_attempts"
  ADD COLUMN "qr_challenge_id" INTEGER;

CREATE UNIQUE INDEX "session_qr_challenges_token_hash_key" ON "session_qr_challenges"("token_hash");
CREATE INDEX "session_qr_challenges_session_id_expires_at_idx" ON "session_qr_challenges"("session_id", "expires_at");
CREATE INDEX "attendance_attempts_qr_challenge_id_idx" ON "attendance_attempts"("qr_challenge_id");

ALTER TABLE "session_qr_challenges" ADD CONSTRAINT "session_qr_challenges_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_qr_challenges" ADD CONSTRAINT "session_qr_challenges_issued_by_fkey"
  FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_qr_challenge_id_fkey"
  FOREIGN KEY ("qr_challenge_id") REFERENCES "session_qr_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
