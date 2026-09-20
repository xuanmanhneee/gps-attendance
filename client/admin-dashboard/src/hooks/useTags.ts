import { useCallback, useEffect, useState } from 'react';

import { tagsApi } from '../api/tags.api';
import { isTag, isTagList, validateTagName } from '../types/tag';
import type { Tag } from '../types/tag';
import {
  applyTagCreated,
  applyTagDeleted,
  runTagMutation,
  toError,
} from '../utils/tags/tag-list';

export type UseTagsResult = {
  tags: Tag[];
  isLoading: boolean;
  /** Đang refresh danh sách (sau mutation hoặc do người dùng bấm thử lại). */
  isRefreshing: boolean;
  error: Error | null;
  /** Lỗi refresh riêng — không được coi là lỗi tạo/xóa tag. */
  refreshError: Error | null;
  reload: () => Promise<void>;
  /** Trả về lỗi refresh (nếu có) thay vì throw; giữ danh sách hiện tại khi lỗi. */
  refresh: () => Promise<Error | null>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: number) => Promise<void>;
};

const invalidTagResponseError = () => new Error('Invalid tag response');

/**
 * Quản lý danh sách tag của tài khoản hiện tại (`GET /tags`).
 *
 * Lỗi được giữ trong state để UI hiển thị; không trả mảng rỗng như thành công.
 * `reload` là lần tải đầu/tải lại thủ công (xoá danh sách khi lỗi), còn
 * `refresh` chạy sau mutation và giữ nguyên danh sách nếu lỗi.
 */
export const useTags = (): UseTagsResult => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshError, setRefreshError] = useState<Error | null>(null);

  const loadTagList = useCallback(async (): Promise<Tag[]> => {
    const data: unknown = await tagsApi.getAll();

    if (!isTagList(data)) {
      throw new Error('Unexpected tag list response');
    }

    return [...data];
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await loadTagList();

      setTags(data);
      setError(null);
      setRefreshError(null);
    } catch (unknownError) {
      setTags([]);
      setError(toError(unknownError, new Error('Unable to load tags')));
    } finally {
      setIsLoading(false);
    }
  }, [loadTagList]);

  useEffect(() => {
    // Fetch khi mount; setState nằm sau `await` nên không gây cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const refresh = useCallback(async (): Promise<Error | null> => {
    setIsRefreshing(true);

    try {
      const data = await loadTagList();

      setTags(data);
      setError(null);
      setRefreshError(null);

      return null;
    } catch (unknownError) {
      const failure = toError(
        unknownError,
        new Error('Unable to refresh tags'),
      );

      // Giữ danh sách hiện tại: dữ liệu cũ vẫn đáng tin hơn danh sách rỗng.
      setRefreshError(failure);

      return failure;
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTagList]);

  const createTag = useCallback(
    async (name: string): Promise<Tag> => {
      const validation = validateTagName(name);

      if (validation.ok === false) {
        throw new Error(
          validation.error === 'tags.nameRequired'
            ? 'Tag name is required'
            : 'Tag name must be at most 100 characters',
        );
      }

      const { result, refreshError: refreshFailure } = await runTagMutation(
        async () => {
          const created: unknown = await tagsApi.create(validation.value);

          if (!isTag(created)) {
            throw invalidTagResponseError();
          }

          return created;
        },
        (created) => setTags((previous) => applyTagCreated(previous, created)),
        refresh,
      );

      setRefreshError(refreshFailure);

      return result;
    },
    [refresh],
  );

  const deleteTag = useCallback(
    async (id: number): Promise<void> => {
      const { refreshError: refreshFailure } = await runTagMutation(
        () => tagsApi.remove(id),
        () => setTags((previous) => applyTagDeleted(previous, id)),
        refresh,
      );

      setRefreshError(refreshFailure);
    },
    [refresh],
  );

  return {
    tags,
    isLoading,
    isRefreshing,
    error,
    refreshError,
    reload,
    refresh,
    createTag,
    deleteTag,
  };
};

