import type {
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  CreateAttendanceSessionRequest,
  LecturerAttendanceAnalytics,
  AttendanceReviewDecision,
} from '@gps-attendance/shared';

import { httpClient } from './http';

export const attendanceSessionsApi = {
  create(request: CreateAttendanceSessionRequest) {
    return httpClient.post<AttendanceSessionResponse>(
      '/v0/attendance-sessions',
      request,
    );
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
  ) {
    return httpClient.post<null>(
      `/v0/attendance-sessions/${sessionId}/attempts/${attemptId}/review`,
      { decision, note },
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

