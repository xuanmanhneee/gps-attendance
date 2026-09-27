// attendance-record.types.ts
import type { UserResponse } from '../users';

export type AttendanceStatus = 'present' | 'absent';

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
  sessionStatus: 'open' | 'pending' | 'closed';
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
}

