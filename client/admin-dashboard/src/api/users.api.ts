import type { UserProfileDto } from '@gps-attendance/shared';
import { httpClient } from './http';

export const usersApi = {
  getMe() {
    return httpClient.get<UserProfileDto>('/users/me');
  },
};
