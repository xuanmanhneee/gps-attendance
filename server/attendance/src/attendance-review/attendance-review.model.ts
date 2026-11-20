import type {
  AttendanceReviewDecision,
  AttendanceStatus,
  AttendanceValidationReason,
} from '@gps-attendance/shared';

import type { AttendanceRecord } from '../attendance-record/attendance-record.model';

export interface AttendanceReviewCandidate {
  sessionId: number;
  userId: number;
  reasons: AttendanceValidationReason[];
  createdAt: Date;
}

export interface RequestAttendanceReviewInput {
  sessionId: number;
  userId: number;
  reasons: AttendanceValidationReason[];
  createdAt: Date;
  expiresAt: Date;
}

export type RequestAttendanceReviewResult =
  'requested' | 'already-present' | 'locked' | 'record-missing';

export type ResolveAttendanceReviewResult =
  | {
      status: 'resolved';
      record: AttendanceRecord;
      candidate: AttendanceReviewCandidate;
      previousStatus: AttendanceRecord['status'];
    }
  | {
      status:
        'record-missing' | 'locked' | 'not-requested' | 'session-flushing';
    };

export interface AttendanceReviewHistoryEntry {
  sessionId: number;
  userId: number;
  resolverId: number;
  decision: AttendanceReviewDecision;
  reasons: AttendanceValidationReason[];
  reason?: string;
  previousStatus: AttendanceStatus;
  resolvedStatus: AttendanceStatus;
}

export interface AttendanceReviewHistoryRecord extends AttendanceReviewHistoryEntry {
  id: string;
  resolvedAt: Date;
}
