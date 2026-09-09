import type { UserFilterCriteria } from '../users';
import type { AttendanceParticipantResponse } from './attendance-record.types';

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

export interface CreateAttendanceSessionPayload {
  title: string;

  latitude: number;
  longitude: number;
  radius: number;

  openAt: string;
  closeAt: string;

  participantCriteria: UserFilterCriteria;
}

export type CreateAttendanceSessionRequest = CreateAttendanceSessionPayload;

export interface AttendanceSessionPayload extends CreateAttendanceSessionPayload {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateAttendanceSessionResponse = AttendanceSessionPayload;
