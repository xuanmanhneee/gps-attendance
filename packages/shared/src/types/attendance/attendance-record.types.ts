// attendance-record.types.ts
import type { UserResponse } from '../users';
import type { AttendanceValidationReason } from './attendance-check-in.types';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceParticipantResponse {
  user: UserResponse;
  status: AttendanceStatus;
  checkedInAt: string | null;
  updatedAt: string;
}

export type AttendanceReviewDecision = 'approve' | 'reject';

export interface AttendanceReviewCandidateResponse {
  sessionId: number;
  userId: number;
  student: UserResponse;
  reasons: AttendanceValidationReason[];
}

export interface ResolveAttendanceReviewRequest {
  decision: AttendanceReviewDecision;
  reason?: string;
}

export interface AttendanceReviewHistoryResponse {
  id: string;
  session: {
    id: number;
    title: string;
  };
  student: UserResponse;
  decision: AttendanceReviewDecision;
  reasons: AttendanceValidationReason[];
  reason: string | null;
  resolvedAt: string;
}
