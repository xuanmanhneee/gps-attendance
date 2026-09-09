import { SessionStatus } from "@gps-attendance/shared";

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
}

export interface CreateAttendanceSessionRecord {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: Date;
  closeAt: Date;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}
