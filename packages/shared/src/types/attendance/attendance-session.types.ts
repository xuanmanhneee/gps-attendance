import type { UserFilterCriteria } from '../users';
import { AttendanceParticipantResponse, AttendanceRecordReponse } from './attendance-record.types';

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

export interface AttendanceSessionDetailResponse {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: string;
  closeAt: string;
  status: SessionStatus;

  participants: AttendanceParticipantResponse[];
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
