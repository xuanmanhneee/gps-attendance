import type { UserFilterCriteria } from '../users';

export interface CreateAttendanceSessionPayload {
  title: string;

  latitude: number;
  longitude: number;
  radius: number;

  openAt: string;
  closeAt: string;

  participantCriteria: UserFilterCriteria;
}
