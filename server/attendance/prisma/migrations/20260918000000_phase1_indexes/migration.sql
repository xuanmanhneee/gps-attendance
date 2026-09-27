-- Add composite indexes used by session and check-in queries.
CREATE INDEX "attendance_sessions_created_by_open_at_close_at_idx"
ON "attendance_sessions"("created_by", "open_at", "close_at");

CREATE INDEX "attendance_records_session_id_device_id_idx"
ON "attendance_records"("session_id", "device_id");