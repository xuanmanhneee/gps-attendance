import type { TagResponse } from '@gps-attendance/shared';

import { httpClient } from './http';
import { MAX_TAG_NAME_LENGTH, validateTagName } from '../types/tag';

const assertValidId = (id: number, label: string) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label}: ${String(id)}`);
  }
};

/**
 * Client cho domain Tags.
 *
 * Backend controller dùng @Controller('tags').
 * httpClient đã unwrap response.data nên client làm việc
 * trực tiếp với kiểu dữ liệu API.
 */
export const tagsApi = {
  getAll(fresh = false) {
    return (fresh ? httpClient.getFresh : httpClient.get)<TagResponse[]>(
      '/tags',
    );
  },

  create(name: string) {
    const result = validateTagName(name);

    if (result.ok === false) {
      if (result.error === 'tags.nameRequired') {
        throw new Error('Tag name is required');
      }

      throw new Error(
        `Tag name must be at most ${MAX_TAG_NAME_LENGTH} characters`,
      );
    }

    return httpClient.post<TagResponse>('/tags', {
      name: result.value,
    });
  },

  remove(id: number) {
    assertValidId(id, 'tag id');

    return httpClient.delete<void>(`/tags/${id}`);
  },

  getAssignedUserIds(tagId: number, fresh = false) {
    assertValidId(tagId, 'tag id');

    return (fresh ? httpClient.getFresh : httpClient.get)<number[]>(
      `/tags/${tagId}/users`,
    );
  },

  assignUser(tagId: number, userId: number) {
    assertValidId(tagId, 'tag id');
    assertValidId(userId, 'user id');

    return httpClient.post<void>(`/tags/${tagId}/users/${userId}`);
  },

  unassignUser(tagId: number, userId: number) {
    assertValidId(tagId, 'tag id');
    assertValidId(userId, 'user id');

    return httpClient.delete<void>(`/tags/${tagId}/users/${userId}`);
  },
};
