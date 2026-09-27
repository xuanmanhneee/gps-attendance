import { AttendanceRecord } from './attendance-record.model';

export interface IAttendanceRecordBuffer {
  getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null>;
  findByUser(userId: number): Promise<AttendanceRecord[]>;
  findBySession(sessionId: number): Promise<AttendanceRecord[]>;
  upsertRecord(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<void>;
  clearSession(sessionId: number): Promise<void>;
}
