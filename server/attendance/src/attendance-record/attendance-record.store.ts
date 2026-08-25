import { AttendanceRecord } from "./attendance-record.model";

export interface IAttendanceRecordStore {
  getRecord(sessionId: number, userId: number): Promise<AttendanceRecord | null>;
  upsertRecord(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<void>;

  // Đếm số lần thử checkin — chỉ dùng để chặn spam, không persist vào AttendanceRecord.
  incrementAttempt(sessionId: number, userId: number): Promise<number>;
  getAttemptCount(sessionId: number, userId: number): Promise<number>;

  clearSession(sessionId: number): Promise<void>;
}