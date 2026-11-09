ALTER TABLE "units"
ADD COLUMN "external_code" VARCHAR(100);

CREATE UNIQUE INDEX "units_external_code_key"
ON "units"("external_code");

ALTER TABLE "attendance_sessions"
ADD COLUMN "finalized_at" TIMESTAMP(3);

CREATE TABLE "integration_session_links" (
  "id" SERIAL NOT NULL,
  "external_id" VARCHAR(100) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "attendance_session_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "integration_session_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_session_links_external_id_key"
ON "integration_session_links"("external_id");

CREATE UNIQUE INDEX "integration_session_links_attendance_session_id_key"
ON "integration_session_links"("attendance_session_id");

ALTER TABLE "integration_session_links"
ADD CONSTRAINT "integration_session_links_attendance_session_id_fkey"
FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
