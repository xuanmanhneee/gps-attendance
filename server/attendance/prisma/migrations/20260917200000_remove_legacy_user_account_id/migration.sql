-- Remove the legacy account relation from users.
ALTER TABLE "users" DROP COLUMN "account_id";
