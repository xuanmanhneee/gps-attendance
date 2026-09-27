// attendance-session.types.ts
import type { UserFilterCriteria } from '../users';
import type {
  AttendanceParticipantResponse,
  AttendanceStatus,
} from './attendance-record.types';

export type SessionStatus = 'pending' | 'open' | 'closed' | 'cancelled';

export interface AttendanceSessionResponse {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // mét
  openAt: string;
  closeAt: string;
  status: SessionStatus;
}

export interface AttendanceSessionDetailResponse extends AttendanceSessionResponse {
  participants: AttendanceParticipantResponse[];
}

export interface MyAttendanceSessionResponse extends AttendanceSessionResponse {
  myAttendance: {
    status: AttendanceStatus;
    checkedInAt: string | null; // null nếu absent
  };
}

export interface CreateAttendanceSessionRequest {
  title: string;

  latitude: number;
  longitude: number;
  radius: number;

  openAt: string;
  closeAt: string;

  participantCriteria: UserFilterCriteria;
}
