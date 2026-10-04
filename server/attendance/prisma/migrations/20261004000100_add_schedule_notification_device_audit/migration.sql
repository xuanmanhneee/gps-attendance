CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'withdrawn', 'completed');
CREATE TYPE "NotificationType" AS ENUM (
  'SESSION_ASSIGNED',
  'SESSION_OPENED',
  'CHECK_IN_RESULT',
  'REVIEW_DECISION',
  'ATTENDANCE_REMINDER',
  'SYSTEM'
);
CREATE TYPE "DeviceTrustStatus" AS ENUM ('UNVERIFIED', 'TRUSTED', 'BLOCKED');
CREATE TYPE "IntegrityProvider" AS ENUM ('PLAY_INTEGRITY', 'APP_ATTEST');

CREATE TABLE "academic_terms" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "academic_year" VARCHAR(20) NOT NULL,
  "semester" INTEGER NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courses" (
  "id" SERIAL NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "credits" INTEGER,
  "unit_id" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rooms" (
  "id" SERIAL NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "building" VARCHAR(100),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_sections" (
  "id" SERIAL NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "course_id" INTEGER NOT NULL,
  "term_id" INTEGER NOT NULL,
  "lecturer_id" INTEGER,
  "room_id" INTEGER,
  "capacity" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_enrollments" (
  "course_section_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("course_section_id", "user_id")
);

CREATE TABLE "timetable_slots" (
  "id" SERIAL NOT NULL,
  "course_section_id" INTEGER NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "start_minute" INTEGER NOT NULL,
  "end_minute" INTEGER NOT NULL,
  "room_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "timetable_slots_day_check" CHECK ("day_of_week" BETWEEN 1 AND 7),
  CONSTRAINT "timetable_slots_start_check" CHECK ("start_minute" BETWEEN 0 AND 1439),
  CONSTRAINT "timetable_slots_end_check" CHECK ("end_minute" BETWEEN 1 AND 1440),
  CONSTRAINT "timetable_slots_time_order_check" CHECK ("end_minute" > "start_minute")
);

CREATE TABLE "notifications" (
  "id" SERIAL NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "session_id" INTEGER,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_notification_states" (
  "notification_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "read_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notification_states_pkey" PRIMARY KEY ("notification_id", "user_id")
);

CREATE TABLE "push_tokens" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "token" VARCHAR(512) NOT NULL,
  "platform" VARCHAR(20) NOT NULL,
  "device_id" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registered_devices" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "platform" VARCHAR(20) NOT NULL,
  "model" VARCHAR(150),
  "trust_status" "DeviceTrustStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blocked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registered_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "device_integrity_checks" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "registered_device_id" INTEGER,
  "session_id" INTEGER,
  "provider" "IntegrityProvider" NOT NULL,
  "verdict" VARCHAR(50) NOT NULL,
  "reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_integrity_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" SERIAL NOT NULL,
  "actor_user_id" INTEGER,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" VARCHAR(100),
  "metadata" JSONB,
  "request_id" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attendance_sessions" ADD COLUMN "course_section_id" INTEGER;

CREATE UNIQUE INDEX "academic_terms_academic_year_semester_key" ON "academic_terms"("academic_year", "semester");
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");
CREATE INDEX "courses_unit_id_idx" ON "courses"("unit_id");
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");
CREATE UNIQUE INDEX "course_sections_term_id_code_key" ON "course_sections"("term_id", "code");
CREATE INDEX "course_sections_course_id_idx" ON "course_sections"("course_id");
CREATE INDEX "course_sections_lecturer_id_idx" ON "course_sections"("lecturer_id");
CREATE INDEX "course_sections_room_id_idx" ON "course_sections"("room_id");
CREATE INDEX "class_enrollments_user_id_status_idx" ON "class_enrollments"("user_id", "status");
CREATE INDEX "timetable_slots_course_section_id_day_of_week_idx" ON "timetable_slots"("course_section_id", "day_of_week");
CREATE INDEX "timetable_slots_room_id_day_of_week_idx" ON "timetable_slots"("room_id", "day_of_week");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX "notifications_session_id_idx" ON "notifications"("session_id");
CREATE INDEX "user_notification_states_user_id_read_at_created_at_idx" ON "user_notification_states"("user_id", "read_at", "created_at");
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");
CREATE UNIQUE INDEX "registered_devices_user_id_device_id_key" ON "registered_devices"("user_id", "device_id");
CREATE INDEX "registered_devices_trust_status_idx" ON "registered_devices"("trust_status");
CREATE INDEX "device_integrity_checks_user_id_checked_at_idx" ON "device_integrity_checks"("user_id", "checked_at");
CREATE INDEX "device_integrity_checks_registered_device_id_checked_at_idx" ON "device_integrity_checks"("registered_device_id", "checked_at");
CREATE INDEX "device_integrity_checks_session_id_idx" ON "device_integrity_checks"("session_id");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "attendance_sessions_course_section_id_idx" ON "attendance_sessions"("course_section_id");

ALTER TABLE "courses" ADD CONSTRAINT "courses_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_term_id_fkey"
  FOREIGN KEY ("term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_lecturer_id_fkey"
  FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_course_section_id_fkey"
  FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_course_section_id_fkey"
  FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_notification_states" ADD CONSTRAINT "user_notification_states_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_notification_states" ADD CONSTRAINT "user_notification_states_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registered_devices" ADD CONSTRAINT "registered_devices_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_integrity_checks" ADD CONSTRAINT "device_integrity_checks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_integrity_checks" ADD CONSTRAINT "device_integrity_checks_registered_device_id_fkey"
  FOREIGN KEY ("registered_device_id") REFERENCES "registered_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "device_integrity_checks" ADD CONSTRAINT "device_integrity_checks_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_course_section_id_fkey"
  FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
