import type { UserProfile } from '@gps-attendance/shared';
import { httpClient } from './http';

export const usersApi = {
  getMe() {
    return httpClient.get<UserProfile>('/users/me');
  },
};
