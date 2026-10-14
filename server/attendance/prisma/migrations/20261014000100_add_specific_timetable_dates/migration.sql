ALTER TABLE "timetable_slots"
  ADD COLUMN "scheduled_date" DATE;

CREATE INDEX "timetable_slots_scheduled_date_idx"
  ON "timetable_slots"("scheduled_date");
