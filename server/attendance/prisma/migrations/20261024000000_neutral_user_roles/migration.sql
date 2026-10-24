-- Preserve existing users while replacing business-specific role values.
BEGIN;

CREATE TYPE "UserRole_new" AS ENUM ('admin', 'organizer', 'participant');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'lecturer' THEN 'organizer'
      WHEN 'student' THEN 'participant'
      ELSE "role"::text
    END
  )::"UserRole_new";

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

COMMIT;
