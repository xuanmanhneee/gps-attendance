// attendance-session.types.ts
import type { UserFilterCriteria } from '../users';
import type {
  AttendanceParticipantResponse,
  AttendanceHistoryEventDto,
  AttendanceStatus,
} from './attendance-record.types';

export type SessionStatus = 'pending' | 'open' | 'closed' | 'cancelled';

export interface AttendanceSessionResponse {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // mét
  gpsAccuracyThreshold?: number | null;
  lecturerValidationRadius?: number | null;
  buildingId?: number | null;
  roomId?: number | null;
  timetableSlotId?: number | null;
  locationSource?: 'MANUAL' | 'BUILDING_REGISTRY';
  location?: {
    building: { id: number; code: string; name: string } | null;
    room: { id: number; code: string; name: string; floor: string | null } | null;
  };
  openAt: string;
  closeAt: string;
  status: SessionStatus;
}

export interface AttendanceAttemptDto {
  id: number;
  userId: number;
  userCode: string;
  userFullname: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceToCenter: number;
  distanceToLecturer?: number | null;
  lecturerProximityVerdict?: 'NEAR' | 'FAR' | 'NO_DATA' | null;
  deviceId: string;
  registeredDeviceId?: number | null;
  deviceTrustStatus?: 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED' | null;
  isMockLocation: boolean;
  serverTimestamp: string;
  result: 'APPROVED' | 'REVIEW' | 'REJECTED' | null;
  reasons: string[];
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  reviewNote?: string | null;
  reviewReason?: string | null;
}

export interface LecturerAttendanceAnalytics {
  totalSessions: number;
  totalStudents: number;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  reviewCount: number;
  atRiskStudents: Array<{
    userId: number;
    userCode: string;
    fullname: string;
    absentCount: number;
    totalSessions: number;
    attendanceRate: number;
  }>;
}

export type AttendanceReviewDecision = 'APPROVED' | 'REJECTED';

export type AttendanceReviewReason =
  | 'OUTSIDE_GEOFENCE'
  | 'GPS_INACCURATE'
  | 'MOCK_LOCATION'
  | 'DEVICE_ISSUE'
  | 'OTHER';

export interface AttendanceSessionDetailResponse extends AttendanceSessionResponse {
  participants: AttendanceParticipantResponse[];
  attempts?: AttendanceAttemptDto[];
  historyEvents?: AttendanceHistoryEventDto[];
}

export interface MyAttendanceSessionResponse extends AttendanceSessionResponse {
  myAttendance: {
    status: AttendanceStatus;
    checkedInAt: string | null; // null nếu absent
  };
}

export interface CreateAttendanceSessionPayload {
  title: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  openAt: string;
  closeAt: string;
  participantCriteria?: UserFilterCriteria;
  courseSectionId?: number;
  timetableSlotId?: number;
}

export type CreateAttendanceSessionRequest = CreateAttendanceSessionPayload;

export interface AttendanceSessionPayload extends CreateAttendanceSessionPayload {
  id: number;
  createdAt: string;
  updatedAt: string;
}
