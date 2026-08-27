import type { UserFilterCriteria } from '../../types/users';

export type SessionStatus = 'pending' | 'open' | 'closed';

export interface AttendanceSessionPayload {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
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
  userFilter: UserFilterCriteria;
}

export interface CreateAttendanceSessionResponse {
  session: AttendanceSessionPayload;
}
