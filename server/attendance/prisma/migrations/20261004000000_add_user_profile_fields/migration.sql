ALTER TABLE "users"
  ADD COLUMN "email" VARCHAR(254),
  ADD COLUMN "phone" VARCHAR(30),
  ADD COLUMN "date_of_birth" VARCHAR(10),
  ADD COLUMN "gender" VARCHAR(30),
  ADD COLUMN "address" VARCHAR(255),
  ADD COLUMN "program_name" VARCHAR(150),
  ADD COLUMN "cohort" VARCHAR(50),
  ADD COLUMN "study_mode" VARCHAR(50);
