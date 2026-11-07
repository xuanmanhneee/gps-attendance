import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewHistoryResponse,
  ResolveAttendanceReviewRequest,
} from '@gps-attendance/shared';

import { httpClient } from './http';

const assertPositiveId = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid ${label}`);
  }

  return value;
};

export const attendanceReviewsApi = {
  history(fresh = false) {
    return (fresh ? httpClient.getFresh : httpClient.get)<
      AttendanceReviewHistoryResponse[]
    >('/v0/attendance/reviews/history');
  },

  list(sessionId: number, fresh = false) {
    return (fresh ? httpClient.getFresh : httpClient.get)<
      AttendanceReviewCandidateResponse[]
    >(
      `/v0/attendance/sessions/${assertPositiveId(sessionId, 'session id')}/reviews`,
    );
  },

  resolve(
    sessionId: number,
    userId: number,
    request: ResolveAttendanceReviewRequest,
  ) {
    return httpClient.patch<void>(
      `/v0/attendance/sessions/${assertPositiveId(sessionId, 'session id')}/reviews/${assertPositiveId(userId, 'user id')}`,
      request,
    );
  },
};
