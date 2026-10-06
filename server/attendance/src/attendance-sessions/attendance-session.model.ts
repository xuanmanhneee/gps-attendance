import { SessionStatus } from "@gps-attendance/shared";

export interface AttendanceSession {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // đơn vị: mét
  gpsAccuracyThreshold?: number | null;
  lecturerValidationRadius?: number | null;
  buildingId?: number | null;
  roomId?: number | null;
  timetableSlotId?: number | null;
  courseSectionId?: number | null;
  locationSource?: 'MANUAL' | 'BUILDING_REGISTRY';
  building?: { id: number; code: string; name: string } | null;
  room?: { id: number; code: string; name: string; floor: string | null } | null;
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
  gpsAccuracyThreshold?: number | null;
  lecturerValidationRadius?: number | null;
  buildingId?: number | null;
  roomId?: number | null;
  timetableSlotId?: number | null;
  courseSectionId?: number | null;
  locationSource?: 'MANUAL' | 'BUILDING_REGISTRY';
  openAt: Date;
  closeAt: Date;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}
