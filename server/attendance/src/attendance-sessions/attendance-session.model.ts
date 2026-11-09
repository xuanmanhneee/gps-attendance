import { SessionStatus } from '@gps-attendance/shared';

export interface AttendanceSession {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // đơn vị: mét
  openAt: Date;
  closeAt: Date;
  status: SessionStatus;
  createdBy: number; // user.id
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date | null;
}

export interface CreateAttendanceSessionRecord {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: Date;
  closeAt: Date;
  createdBy: number;
}

export type UpdateAttendanceSessionRecord = Partial<
  Pick<
    AttendanceSession,
    | 'title'
    | 'latitude'
    | 'longitude'
    | 'radius'
    | 'openAt'
    | 'closeAt'
    | 'status'
    | 'finalizedAt'
  >
>;
