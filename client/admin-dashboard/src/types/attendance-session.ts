import type { UserFilterCriteria } from '@gps-attendance/shared';

export interface CreateSessionFormData {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: string;
  closeAt: string;
  participantCriteria: UserFilterCriteria;
}
