import { useCallback, useEffect, useRef, useState } from 'react';

import { usersApi } from '../api/users.api';
import { toOrganizerOptions } from '../utils/attendance-sessions/session-filter';
import type { OrganizerOption } from '../utils/attendance-sessions/session-filter';
import { toError } from '../utils/attendance-sessions/session-list';

/**
 * Danh sách organizer cho bộ lọc phiên điểm danh của admin.
 *
 * Chỉ dùng ở route admin: `GET /v0/users` do backend kiểm soát quyền; hook
 * chỉ lọc role `organizer` phía client để đổ dropdown. Lỗi tải directory được
 * giữ trong state để UI hiển thị rõ ràng kèm nút thử lại, không nuốt lỗi.
 */
export const useOrganizers = () => {
  const [organizerOptions, setOrganizerOptions] = useState<OrganizerOption[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadIdRef = useRef(0);

  const reload = useCallback(async (fresh = true) => {
    // Chặn stale response: chỉ request mới nhất được ghi state.
    const requestId = ++loadIdRef.current;
    const isActive = () => loadIdRef.current === requestId;

    setIsLoading(true);
    setError(null);

    try {
      const data: unknown = await usersApi.getAll(fresh);

      if (!isActive()) return;

      setOrganizerOptions(toOrganizerOptions(data));
    } catch (unknownError) {
      if (!isActive()) return;

      setError(
        toError(
          unknownError,
          new Error('Unable to load the organizer directory'),
        ),
      );
    } finally {
      if (isActive()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
  }, [reload]);

  return {
    organizerOptions,
    isLoading,
    error,
    reload,
  };
};
