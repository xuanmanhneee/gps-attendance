// attendance-session.types.ts
import type { UserFilterCriteria } from '../users';
<<<<<<< HEAD
import type { AttendanceParticipantResponse } from './attendance-record.types';
=======
import type {
  AttendanceParticipantResponse,
  AttendanceStatus,
} from './attendance-record.types';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

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

<<<<<<< HEAD
export interface AttendanceAttemptDto {
  id: number;
  userId: number;
  userCode: string;
  userFullname: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceToCenter: number;
  deviceId: string;
  isMockLocation: boolean;
  serverTimestamp: string;
  result: 'APPROVED' | 'REVIEW' | 'REJECTED' | null;
  reasons: string[];
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

=======
export interface AttendanceSessionDetailResponse extends AttendanceSessionResponse {
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  participants: AttendanceParticipantResponse[];
  attempts?: AttendanceAttemptDto[];
}

<<<<<<< HEAD
export interface CreateAttendanceSessionPayload {
=======
export interface MyAttendanceSessionResponse extends AttendanceSessionResponse {
  myAttendance: {
    status: AttendanceStatus;
    checkedInAt: string | null; // null nếu absent
  };
}

export interface CreateAttendanceSessionRequest {
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
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
