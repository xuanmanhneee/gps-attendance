import { httpClient } from './http';
import type { UserProfileResponse } from '@gps-attendance/shared';

export const userApi = {
  getProfile(): Promise<UserProfileResponse> {
    return httpClient.get<UserProfileResponse>('/v0/users/me');
  },
};