// attendance-record.types.ts
import type { UserResponse } from '../users';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type AttendanceHistoryEventType =
  | 'SESSION_ASSIGNED'
  | 'CHECK_IN_ATTEMPT'
  | 'REVIEW_DECISION'
  | 'RECORD_UPDATED';

export interface AttendanceHistoryEventDto {
  id: number;
  sessionId: number;
  sessionTitle: string;
  eventType: AttendanceHistoryEventType;
  status: AttendanceStatus | null;
  attemptResult: 'APPROVED' | 'REVIEW' | 'REJECTED' | null;
  reasons: string[];
  note: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface AttendanceParticipantResponse {
  user: UserResponse;
  status: AttendanceStatus;
  checkedInAt: string | null;
  checkinAt?: string | null;
  updatedAt: string;
}


export interface StudentAttendanceHistoryItemDto {
  id: number;
  sessionId: number;
  sessionTitle: string;
  sessionStatus: 'open' | 'pending' | 'closed' | 'cancelled';
  openAt: string;
  closeAt: string;
  radius: number;
  sessionLatitude: number;
  sessionLongitude: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkedInAt: string | null;
  deviceId: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceMeters: number | null;
  attemptResult?: 'APPROVED' | 'REVIEW' | 'REJECTED' | null;
  attemptReasons?: string[];
  attemptReviewedAt?: string | null;
  attemptReviewNote?: string | null;
}

export interface StudentAttendanceSummary {
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  upcomingSessions: number;
  needsAttentionCount: number;
}

