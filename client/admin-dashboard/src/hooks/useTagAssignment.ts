import { useCallback, useEffect, useMemo, useState } from 'react';

import { tagsApi } from '../api/tags.api';
import { usersApi } from '../api/users.api';
import { isDirectoryUserList, isUserIdList } from '../types/tag';
import type { DirectoryUser, Tag } from '../types/tag';
import type { RequestScopeToken } from '../utils/request-scope';
import { createRequestScope } from '../utils/request-scope';
import { toError } from '../utils/tags/tag-list';
import {
  canStartAssignmentMutation,
  withPendingUser,
} from '../utils/tags/tag-pending';

export type UseTagAssignmentResult = {
  selectedTag: Tag | null;
  assignedUserIds: number[];
  directory: DirectoryUser[];
  directoryError: Error | null;
  isLoading: boolean;
  error: Error | null;
  /** Pending theo từng user ID — nhiều row có thể pending đồng thời. */
  pendingUserIds: ReadonlySet<number>;
  openFor: (tag: Tag) => void;
  close: () => void;
  reload: () => Promise<void>;
  assign: (userId: number) => Promise<void>;
  unassign: (userId: number) => Promise<void>;
};

const normalizeDirectory = (value: unknown): DirectoryUser[] | null => {
  if (isDirectoryUserList(value)) return [...value];
  if (!Array.isArray(value)) return null;

  const out: DirectoryUser[] = [];

  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;

    const row = item as Record<string, unknown>;
    const id = row.id;

    if (
      typeof id === 'number' &&
      Number.isInteger(id) &&
      id > 0 &&
      typeof row.code === 'string' &&
      typeof row.fullname === 'string'
    ) {
      out.push({ id, code: row.code, fullname: row.fullname });
    }
  }

  return out;
};

/**
 * Quản lý assignment của một tag (`GET /tags/:tagId/users`).
 *
 * `createRequestScope` đảm bảo response của tag cũ không ghi đè state của tag
 * mới: mọi commit phải qua `scope.isCurrent(token)`. Khi đổi tag hoặc đóng
 * panel, `scope.invalidate()` làm mọi request đang chạy trở thành stale.
 */
export const useTagAssignment = (): UseTagAssignmentResult => {
  const scope = useMemo(() => createRequestScope(), []);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [directoryError, setDirectoryError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingUserIds, setPendingUserIds] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );

  const setPending = useCallback((userId: number, isPending: boolean) => {
    setPendingUserIds((previous) =>
      withPendingUser(previous, userId, isPending),
    );
  }, []);

  const loadAssignment = useCallback(
    async (tag: Tag, token: RequestScopeToken, fresh: boolean) => {
      const assignment: unknown = await tagsApi.getAssignedUserIds(
        tag.id,
        fresh,
      );

      if (!scope.isCurrent(token)) return;

      if (!isUserIdList(assignment)) {
        throw new Error('Unexpected assignment response');
      }

      setAssignedUserIds([...assignment]);

      // Directory chỉ dùng để hiển thị tên; lỗi ở đây không làm hỏng assignment.
      try {
        const users: unknown = await usersApi.getAll(fresh);

        if (!scope.isCurrent(token)) return;

        const normalized = normalizeDirectory(users);

        if (!normalized) {
          throw new Error('Unexpected user directory response');
        }

        setDirectory(normalized);
        setDirectoryError(null);
      } catch (directoryFailure) {
        if (!scope.isCurrent(token)) return;

        setDirectory([]);
        setDirectoryError(
          toError(directoryFailure, new Error('Unable to load users')),
        );
      }
    },
    [scope],
  );

  const reload = useCallback(
    async (fresh = true) => {
      const tag = selectedTag;

      if (!tag) return;

      const token = scope.begin(tag.id);

      setIsLoading(true);
      setError(null);

      try {
        await loadAssignment(tag, token, fresh);
      } catch (unknownError) {
        if (scope.isCurrent(token)) {
          setAssignedUserIds([]);
          setError(
            toError(unknownError, new Error('Unable to load assignments')),
          );
        }
      } finally {
        if (scope.isCurrent(token)) setIsLoading(false);
      }
    },
    [loadAssignment, scope, selectedTag],
  );

  const openFor = useCallback(
    (tag: Tag) => {
      // Request của tag trước không còn được phép ghi state.
      scope.invalidate();
      setSelectedTag(tag);
      setAssignedUserIds([]);
      setDirectory([]);
      setDirectoryError(null);
      setError(null);
      setPendingUserIds(new Set<number>());
      setIsLoading(true);
    },
    [scope],
  );

  const close = useCallback(() => {
    scope.invalidate();
    setSelectedTag(null);
    setAssignedUserIds([]);
    setDirectory([]);
    setDirectoryError(null);
    setError(null);
    setPendingUserIds(new Set<number>());
    setIsLoading(false);
  }, [scope]);

  useEffect(() => {
    if (!selectedTag) return;

    // Fetch khi đổi tag; setState nằm sau `await` nên không gây cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
  }, [selectedTag, reload]);

  const mutateAssignment = useCallback(
    async (
      userId: number,
      mutate: (tagId: number, targetUserId: number) => Promise<void>,
    ) => {
      const tag = selectedTag;

      if (!tag) return;

      // Single-flight: UI đã disable control khi còn mutation chạy, đây là
      // chốt chặn thứ hai để không có hai request refresh chồng nhau.
      if (canStartAssignmentMutation(pendingUserIds) === false) return;

      const token = scope.begin(tag.id);

      setPending(userId, true);
      setError(null);

      try {
        await mutate(tag.id, userId);

        const fresh: unknown = await tagsApi.getAssignedUserIds(tag.id);

        // Thao tác của tag cũ: bỏ qua, không commit và không báo lỗi cho tag mới.
        if (!scope.isCurrent(token)) return;

        if (!isUserIdList(fresh)) {
          throw new Error('Unexpected assignment response');
        }

        setAssignedUserIds([...fresh]);
      } catch (unknownError) {
        if (!scope.isCurrent(token)) return;

        setError(
          toError(unknownError, new Error('Unable to update assignment')),
        );
        throw unknownError;
      } finally {
        // Chỉ xoá pending của chính user này; nếu tag đã đổi thì state đã reset.
        if (scope.currentKey() === tag.id) setPending(userId, false);
      }
    },
    [pendingUserIds, scope, selectedTag, setPending],
  );

  const assign = useCallback(
    (userId: number) =>
      mutateAssignment(userId, (tagId, targetUserId) =>
        tagsApi.assignUser(tagId, targetUserId),
      ),
    [mutateAssignment],
  );

  const unassign = useCallback(
    (userId: number) =>
      mutateAssignment(userId, (tagId, targetUserId) =>
        tagsApi.unassignUser(tagId, targetUserId),
      ),
    [mutateAssignment],
  );

  return {
    selectedTag,
    assignedUserIds,
    directory,
    directoryError,
    isLoading,
    error,
    pendingUserIds,
    openFor,
    close,
    reload,
    assign,
    unassign,
  };
};
