import { AttendanceRecord, MarkPresentInput } from './attendance-record.model';

export type MarkPresentResult =
  | 'present'
  | 'already-present'
  | 'device-used'
  | 'record-missing';

export interface IAttendanceRecordBuffer {
  getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null>;
  findByUser(userId: number): Promise<AttendanceRecord[]>;
  findBySession(sessionId: number): Promise<AttendanceRecord[]>;
  upsertRecord(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<void>;
  markPresentIfEligible(
    input: MarkPresentInput,
    deviceId: string,
    deviceTtlSeconds: number,
  ): Promise<MarkPresentResult>;
  clearSession(sessionId: number): Promise<void>;
}
