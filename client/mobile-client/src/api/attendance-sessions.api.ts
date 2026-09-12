import { httpClient } from './http';
import type { MyAttendanceSessionResponse } from '@gps-attendance/shared';

export const attendanceSessionsApi = {
  async getSessions(): Promise<MyAttendanceSessionResponse[]> {
    return httpClient.get<MyAttendanceSessionResponse[]>(
      '/v0/attendance-sessions/me',
    );
  },
};
