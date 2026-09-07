import type { UserFilterCriteria } from '../users';

export type SessionStatus = 'pending' | 'open' | 'closed';

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

export interface CreateAttendanceSessionRequest {
  title: string;

  latitude: number;
  longitude: number;
  radius: number;

  openAt: string;
  closeAt: string;

  participantCriteria: UserFilterCriteria;
}
