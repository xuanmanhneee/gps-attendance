import { httpClient } from './http';
import type { UpdateMyProfileRequest, UserProfileResponse } from '@gps-attendance/shared';

export const userApi = {
  getProfile(): Promise<UserProfileResponse> {
    return httpClient.get<UserProfileResponse>('/v0/users/me');
  },

  updateProfile(data: UpdateMyProfileRequest): Promise<UserProfileResponse> {
    return httpClient.patch<UserProfileResponse>('/v0/users/me', data);
  },
};