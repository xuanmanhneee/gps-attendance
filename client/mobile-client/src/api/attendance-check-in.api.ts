import { CheckInRequest, CheckInResponse } from '@gps-attendance/shared';
import { httpClient } from './http';

export const attendanceCheckInApi = {
  async checkIn(payload: CheckInRequest): Promise<CheckInResponse> {
    return httpClient.post<CheckInResponse>('/v0/attendance/check-in', payload);
  },
};
