import type { UserProfileResponse } from '@gps-attendance/shared';
import { httpClient } from './http';

export const usersApi = {
  getMe() {
    return httpClient.get<UserProfileResponse>('/v0/users/me');
  },
};
