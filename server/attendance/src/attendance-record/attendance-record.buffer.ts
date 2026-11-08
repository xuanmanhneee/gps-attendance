import { AttendanceRecord, MarkPresentInput } from './attendance-record.model';

export type MarkPresentResult =
  | 'present'
  | 'already-present'
  | 'locked'
  | 'device-used'
  | 'record-missing'
  | 'session-flushing';

export type ResolveAttendanceReviewRecordResult =
  | {
      status: 'resolved';
      record: AttendanceRecord;
      previousStatus: AttendanceRecord['status'];
    }
  | {
      status: 'record-missing' | 'locked' | 'session-flushing';
    };

export interface IAttendanceRecordBuffer {
  getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null>;
  findByUser(userId: number): Promise<AttendanceRecord[]>;
  findBySession(sessionId: number): Promise<AttendanceRecord[]>;
  upsertRecord(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<void>;
  // Chỉ tạo record còn thiếu; retry khởi tạo roster không ghi đè check-in.
  insertRecordIfAbsent(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void>;
  // Ghi present và giữ device trong một thao tác nguyên tử. Service kiểm tra
  // thời gian, vị trí và quyền trước khi gọi; buffer chỉ bảo đảm trạng thái ghi.
  tryMarkPresentAndClaimDevice(
    input: MarkPresentInput,
    deviceId: string,
    deviceTtlSeconds: number,
  ): Promise<MarkPresentResult>;
  resolveReviewRecord(
    sessionId: number,
    userId: number,
    decision: 'approve' | 'reject',
    resolverId: number,
    candidateCreatedAt: Date,
  ): Promise<ResolveAttendanceReviewRecordResult>;
  // Đóng quyền ghi và lấy snapshot trong cùng một thao tác nguyên tử.
  beginSessionFlush(sessionId: number): Promise<AttendanceRecord[]>;
  // Chỉ xoá buffer sau khi snapshot đã được lưu bền vững.
  completeSessionFlush(sessionId: number): Promise<void>;
  clearSession(sessionId: number): Promise<void>;
}
