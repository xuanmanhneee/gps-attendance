CREATE TYPE "RegistryLocationType" AS ENUM ('BUILDING', 'FACILITY');
CREATE TYPE "RegistryLocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SessionLocationSource" AS ENUM ('MANUAL', 'BUILDING_REGISTRY');
CREATE TYPE "LecturerLocationVerificationStatus" AS ENUM ('PASS', 'WARNING');

CREATE TABLE "campuses" (
  "id" SERIAL NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "buildings" (
  "id" SERIAL NOT NULL,
  "campus_id" INTEGER NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "geofence_radius" DECIMAL(8,2),
  "gps_accuracy_threshold" DECIMAL(8,2),
  "lecturer_validation_radius" DECIMAL(8,2),
  "type" "RegistryLocationType" NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" "RegistryLocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "rooms"
  ADD COLUMN "building_id" INTEGER,
  ADD COLUMN "floor" VARCHAR(30),
  ADD COLUMN "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "attendance_sessions"
  ADD COLUMN "building_id" INTEGER,
  ADD COLUMN "room_id" INTEGER,
  ADD COLUMN "timetable_slot_id" INTEGER,
  ADD COLUMN "gps_accuracy_threshold" DECIMAL(8,2),
  ADD COLUMN "lecturer_validation_radius" DECIMAL(8,2),
  ADD COLUMN "location_source" "SessionLocationSource" NOT NULL DEFAULT 'MANUAL';

CREATE TABLE "lecturer_location_verifications" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "lecturer_id" INTEGER NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "accuracy" DECIMAL(8,2) NOT NULL,
  "client_timestamp" TIMESTAMP(3) NOT NULL,
  "server_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "distance_meters" DECIMAL(8,2) NOT NULL,
  "status" "LecturerLocationVerificationStatus" NOT NULL,
  "reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lecturer_location_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campuses_code_key" ON "campuses"("code");
CREATE UNIQUE INDEX "buildings_code_key" ON "buildings"("code");
CREATE INDEX "buildings_campus_id_type_status_idx" ON "buildings"("campus_id", "type", "status");
CREATE INDEX "rooms_building_id_floor_status_idx" ON "rooms"("building_id", "floor", "status");
CREATE INDEX "attendance_sessions_building_id_idx" ON "attendance_sessions"("building_id");
CREATE INDEX "attendance_sessions_room_id_idx" ON "attendance_sessions"("room_id");
CREATE INDEX "attendance_sessions_timetable_slot_id_idx" ON "attendance_sessions"("timetable_slot_id");
CREATE INDEX "lecturer_location_verifications_session_id_created_at_idx" ON "lecturer_location_verifications"("session_id", "created_at");
CREATE INDEX "lecturer_location_verifications_lecturer_id_created_at_idx" ON "lecturer_location_verifications"("lecturer_id", "created_at");

ALTER TABLE "buildings" ADD CONSTRAINT "buildings_campus_id_fkey"
  FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_fkey"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_building_id_fkey"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_timetable_slot_id_fkey"
  FOREIGN KEY ("timetable_slot_id") REFERENCES "timetable_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lecturer_location_verifications" ADD CONSTRAINT "lecturer_location_verifications_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lecturer_location_verifications" ADD CONSTRAINT "lecturer_location_verifications_lecturer_id_fkey"
  FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "campuses" ("code", "name", "updated_at")
VALUES ('DLU', 'Đại học Đà Lạt', CURRENT_TIMESTAMP);

INSERT INTO "buildings"
  ("campus_id", "code", "name", "latitude", "longitude", "type", "verified", "status", "updated_at")
VALUES
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A1', 'A1', 11.9545810, 108.4439870, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A2', 'A2', 11.9550840, 108.4445440, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A3', 'A3', 11.9553820, 108.4439460, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A4', 'A4', 11.9549810, 108.4433700, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A5', 'A5', 11.9557870, 108.4433770, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A6', 'A6', 11.9560650, 108.4453660, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A7', 'A7', 11.9559760, 108.4465890, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A8', 'A8', 11.9555790, 108.4465590, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'HOI_TRUONG_TV', 'Hội trường TV', 11.9572580, 108.4450360, 'FACILITY', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'NHA_THI_DAU', 'Nhà Thi Đấu', 11.9563890, 108.4477400, 'FACILITY', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A11', 'A11', 11.9557720, 108.4475250, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'NHA_GUI_XE', 'Nhà gửi xe', 11.9540030, 108.4449890, 'FACILITY', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A16', 'A16', 11.9567100, 108.4466830, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A18', 'A18', 11.9564100, 108.4460030, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A19', 'A19', 11.9569780, 108.4460000, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A20', 'A20', 11.9572550, 108.4463900, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A21', 'A21', 11.9567560, 108.4455590, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A24', 'A24', 11.9565310, 108.4446690, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A25', 'A25 (Tháp sao)', 11.9566100, 108.4438150, 'FACILITY', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A27', 'A27', 11.9556840, 108.4430980, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A30', 'A30', 11.9565110, 108.4430490, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A31', 'A31', 11.9578870, 108.4440480, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP),
  ((SELECT "id" FROM "campuses" WHERE "code" = 'DLU'), 'A32', 'A32 (Hội trường, Lớp học)', 11.9578910, 108.4458150, 'BUILDING', FALSE, 'ACTIVE', CURRENT_TIMESTAMP);
