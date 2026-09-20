import { httpClient } from './http';
import { MAX_TAG_NAME_LENGTH, validateTagName } from '../types/tag';
import type { Tag } from '../types/tag';

const assertValidId = (id: number, label: string) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label}: ${String(id)}`);
  }
};

/**
 * Client cho domain Tags.
 *
 * Backend controller là `@Controller('tags')` (không có prefix `/v0`),
 * response thô được bọc `{ success: true, data }` và `httpClient` đã unwrap
 * `data` nên client chỉ làm việc với `Tag`/`number[]`.
 * Không có update client vì backend chưa expose `PATCH /tags/:id`.
 */
export const tagsApi = {
  getAll() {
    return httpClient.get<Tag[]>('/tags');
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

    return httpClient.post<Tag>('/tags', { name: result.value });
  },

  remove(id: number) {
    assertValidId(id, 'tag id');

    return httpClient.delete<void>(`/tags/${id}`);
  },

  getAssignedUserIds(tagId: number) {
    assertValidId(tagId, 'tag id');

    return httpClient.get<number[]>(`/tags/${tagId}/users`);
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
