import type {
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  CreateAttendanceSessionRequest,
  UpdateAttendanceSessionRequest,
  UserFilterCriteria,
} from '@gps-attendance/shared';

import { httpClient } from './http';

/**
 * Chặn id không hợp lệ trước khi ghép URL (`/v0/attendance-sessions/NaN`).
 *
 * Page đã validate route param; đây là lớp phòng ngừa thứ hai ở tầng API.
 */
const assertSessionId = (id: number): number => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid attendance session id');
  }

  return id;
};

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

  /** Chỉ dùng cho page organizer: endpoint backend yêu cầu role organizer. */
  getCreatedByMe() {
    return httpClient.get<AttendanceSessionResponse[]>(
      '/v0/attendance-sessions/created-by-me',
    );
  },

  /**
   * Lọc session theo organizer cho admin.
   *
   * Chỉ dùng khi UI admin cần lọc theo organizer vì endpoint backend yêu cầu
   * role admin (`GET /created-by?userId=...`).
   */
  getCreatedBy(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('Invalid organizer user id');
    }

    return httpClient.get<AttendanceSessionResponse[]>(
      `/v0/attendance-sessions/created-by?userId=${userId}`,
    );
  },

  getDetail(id: number) {
    return httpClient.get<AttendanceSessionDetailResponse>(
      `/v0/attendance-sessions/${assertSessionId(id)}`,
    );
  },

  update(id: number, request: UpdateAttendanceSessionRequest) {
    return httpClient.patch<AttendanceSessionResponse>(
      `/v0/attendance-sessions/${assertSessionId(id)}`,
      request,
    );
  },

  cancel(id: number) {
    return httpClient.patch<AttendanceSessionResponse>(
      `/v0/attendance-sessions/${assertSessionId(id)}/cancel`,
    );
  },

  getCriteria(id: number) {
    return httpClient.get<{ criteria: UserFilterCriteria | null }>(
      `/v0/attendance-sessions/${assertSessionId(id)}/criteria`,
    );
  },
};
