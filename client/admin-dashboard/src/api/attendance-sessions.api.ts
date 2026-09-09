import type {
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

  getById(id: number) {
    return httpClient.get<AttendanceSessionResponse>(
      `/v0/attendance-sessions/${id}`,
    );
  },

  getByUser(userId: number) {
    return httpClient.get<AttendanceSessionResponse[]>(
      `/v0/attendance-sessions/by-user/${userId}`,
    );
  },
};