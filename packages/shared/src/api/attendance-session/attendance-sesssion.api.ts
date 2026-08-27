import type { ApiResponse } from '../response';
import { http } from '../http';
import { 
    AttendanceSessionPayload, 
    CreateAttendanceSessionRequest, 
    CreateAttendanceSessionResponse 
} from './attendance-session.type';

export const attendanceSessionApi = {
  create(
    request: CreateAttendanceSessionRequest,
  ): Promise<ApiResponse<CreateAttendanceSessionResponse>> {
    return http.post<ApiResponse<CreateAttendanceSessionResponse>>(
      '/v0/attendance-sessions',
      request,
    );
  },

  getAll(): Promise<ApiResponse<AttendanceSessionPayload[]>> {
    return http.get<ApiResponse<AttendanceSessionPayload[]>>(
      '/v0/attendance-sessions',
    );
  },

  getById(
    id: number,
  ): Promise<ApiResponse<AttendanceSessionPayload>> {
    return http.get<ApiResponse<AttendanceSessionPayload>>(
      `/v0/attendance-sessions/${id}`,
    );
  },
};