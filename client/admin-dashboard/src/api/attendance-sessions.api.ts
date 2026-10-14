import type {
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  CreateAttendanceSessionRequest,
  LecturerAttendanceAnalytics,
  AttendanceReviewDecision,
  AttendanceReviewReason,
} from '@gps-attendance/shared';

import { httpClient } from './http';

export interface RegistryRoomOption {
  id: number;
  code: string;
  name: string;
  floor: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  building: {
    id: number;
    code: string;
    name: string;
    type: 'BUILDING' | 'FACILITY';
    status: 'ACTIVE' | 'INACTIVE';
    verified: boolean;
    latitude: number;
    longitude: number;
    geofenceRadius: number | null;
    gpsAccuracyThreshold: number | null;
  } | null;
}

export interface TeachingSectionOption {
  id: number;
  code: string;
  course: { code: string; name: string };
  term: {
    name: string;
    academicYear: string;
    semester: number;
    startDate: string;
    endDate: string;
  };
  room: RegistryRoomOption | null;
  activeEnrollmentCount: number;
  timetable: Array<{
    id: number;
    dayOfWeek: number;
    scheduledDate: string | null;
    startMinute: number;
    endMinute: number;
    room: RegistryRoomOption | null;
  }>;
}

export interface SectionRosterStudent {
  id: number;
  code: string;
  fullname: string;
  email: string | null;
  enrolledAt: string;
}

export interface SectionRoster {
  section: {
    id: number;
    code: string;
    capacity: number | null;
    lecturerId: number | null;
    course: { code: string; name: string };
    term: { name: string; academicYear: string; semester: number };
  };
  students: SectionRosterStudent[];
}

export interface LecturerGpsEvidence {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export const attendanceSessionsApi = {
  create(request: CreateAttendanceSessionRequest) {
    return httpClient.post<AttendanceSessionResponse>(
      '/v0/attendance-sessions',
      request,
    );
  },

  getTeachingSections() {
    return httpClient.get<TeachingSectionOption[]>(
      '/v0/attendance-sessions/teaching-sections',
    );
  },

  getSectionRoster(sectionId: number) {
    return httpClient.get<SectionRoster>(
      `/v0/attendance-sessions/sections/${sectionId}/roster`,
    );
  },

  verifyLecturerLocation(sessionId: number, evidence: LecturerGpsEvidence) {
    return httpClient.post<{
      status: 'PASS' | 'WARNING';
      reasons: string[];
      distanceMeters: number;
      sessionCenterChanged: false;
    }>(
      `/v0/attendance-sessions/${sessionId}/lecturer-location-verification`,
      evidence,
    );
  },

  updateDeviceTrust(
    registeredDeviceId: number,
    trustStatus: 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED',
    note?: string,
  ) {
    return httpClient.patch<{
      id: number;
      userCode: string;
      deviceId: string;
      trustStatus: 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED';
    }>(`/v0/admin/devices/${registeredDeviceId}/trust`, { trustStatus, note });
  },

  getAll() {
    return httpClient.get<AttendanceSessionResponse[]>(
      '/v0/attendance-sessions',
    );
  },

  getCreatedByMe() {
    return httpClient.get<AttendanceSessionResponse[]>(
      '/v0/attendance-sessions/created-by-me',
    );
  },

  getAnalytics() {
    return httpClient.get<LecturerAttendanceAnalytics>(
      '/v0/attendance-sessions/analytics',
    );
  },

  reviewAttempt(
    sessionId: number,
    attemptId: number,
    decision: AttendanceReviewDecision,
    note: string,
    reviewReason?: AttendanceReviewReason,
  ) {
    return httpClient.post<null>(
      `/v0/attendance-sessions/${sessionId}/attempts/${attemptId}/review`,
      { decision, note, reviewReason },
    );
  },

  getDetail(id: number) {
    return httpClient.get<AttendanceSessionDetailResponse>(
      `/v0/attendance-sessions/${id}/detail`,
    );
  },
  close(id: number) {
    return httpClient.post<AttendanceSessionResponse>(
      `/v0/attendance-sessions/${id}/close`,
    );
  },

  cancel(id: number) {
    return httpClient.patch<AttendanceSessionResponse>(
      `/v0/attendance-sessions/${id}/cancel`,
    );
  },

  remove(id: number) {
    return httpClient.delete<null>(`/v0/attendance-sessions/${id}`);
  },
};
