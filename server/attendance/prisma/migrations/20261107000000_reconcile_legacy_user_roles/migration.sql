-- Normalize legacy business roles even when an earlier role migration was
-- already recorded as applied on a database that still contains old values.
BEGIN;

CREATE TYPE "Role_reconciled" AS ENUM ('admin', 'organizer', 'participant');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_reconciled"
  USING (
    CASE "role"::text
      WHEN 'lecturer' THEN 'organizer'
      WHEN 'student' THEN 'participant'
      ELSE "role"::text
    END
  )::"Role_reconciled";

ALTER TYPE "Role" RENAME TO "Role_legacy";
ALTER TYPE "Role_reconciled" RENAME TO "Role";
DROP TYPE "Role_legacy";

COMMIT;
