import { StudentAttendanceHistoryItemDto } from '@gps-attendance/shared';
import { AttendanceRecord } from './attendance-record.model';

export interface IAttendanceRecordRepository {
  getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null>;
  findByUser(userId: number): Promise<AttendanceRecord[]>;
  findBySession(sessionId: number): Promise<AttendanceRecord[]>;
  findDetailedHistoryByUser(
    userId: number,
  ): Promise<StudentAttendanceHistoryItemDto[]>;
  upsertRecord(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<void>;
}

