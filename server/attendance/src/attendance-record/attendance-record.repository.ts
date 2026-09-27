import { AttendanceRecord } from './attendance-record.model';

export interface IAttendanceRecordRepository {
  getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null>;
  findByUser(userId: number): Promise<AttendanceRecord[]>;
  findBySession(sessionId: number): Promise<AttendanceRecord[]>;
  bulkUpsert(records: AttendanceRecord[]): Promise<void>;
}
