import {
  AttendanceHistoryEventDto,
  AttendanceHistoryEventType,
  AttendanceStatus,
  StudentAttendanceHistoryItemDto,
} from '@gps-attendance/shared';
import { AttendanceRecord } from './attendance-record.model';

export interface CreateAttendanceHistoryEventInput {
  sessionId: number;
  userId: number;
  actorId?: number | null;
  attemptId?: number | null;
  eventType: AttendanceHistoryEventType;
  status?: AttendanceStatus | null;
  attemptResult?: 'APPROVED' | 'REVIEW' | 'REJECTED' | null;
  reasons?: string[];
  reviewReason?: string | null;
  note?: string | null;
}

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
  createHistoryEvent(event: CreateAttendanceHistoryEventInput): Promise<void>;
  findHistoryEventsByUser(userId: number): Promise<AttendanceHistoryEventDto[]>;
  findById(id: number): Promise<StudentAttendanceHistoryItemDto | null>;
  upsertRecord(record: Omit<AttendanceRecord, 'updatedAt'>): Promise<void>;
}

// Alias tương thích ngược
export type IAttendanceRecordStore = IAttendanceRecordRepository;
