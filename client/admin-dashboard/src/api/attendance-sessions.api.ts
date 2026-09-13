import type {
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  CreateAttendanceSessionRequest,
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

  getDetail(id: number) {
    return httpClient.get<AttendanceSessionDetailResponse>(
      `/v0/attendance-sessions/${id}/detail`,
    );
  },

  getByUser(userId: number) {
    return httpClient.get<AttendanceSessionResponse[]>(
      `/v0/attendance-sessions/by-user/${userId}`,
    );
  },

  remove(id: number) {
    return httpClient.delete<null>(`/v0/attendance-sessions/${id}`);
  },
};