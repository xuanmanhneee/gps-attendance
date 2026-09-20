import type { UserProfileResponse } from '@gps-attendance/shared';
import { httpClient } from './http';
import type { DirectoryUser } from '../types/tag';

export const usersApi = {
  getMe() {
    return httpClient.get<UserProfileResponse>('/v0/users/me');
  },

  /**
   * Danh sách user để hiển thị tên khi gán tag.
   *
   * Endpoint `GET /v0/users` đã có ở backend (trả về `User[]`, dư field so với
   * `DirectoryUser`). Hook kiểm tra shape và chỉ giữ `id/code/fullname`;
   * khi lỗi, panel assignment fallback hiển thị `ID {id}`.
   */
  getAll() {
    return httpClient.get<DirectoryUser[]>('/v0/users');
  },
};

