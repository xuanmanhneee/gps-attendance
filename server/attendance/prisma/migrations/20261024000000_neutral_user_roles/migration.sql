-- Migrate existing users to the neutral role names used by the merged system.
BEGIN;

CREATE TYPE "Role_new" AS ENUM ('admin', 'organizer', 'participant');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE "role"::text
      WHEN 'lecturer' THEN 'organizer'
      WHEN 'student' THEN 'participant'
      ELSE "role"::text
    END
  )::"Role_new";

ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

COMMIT;
