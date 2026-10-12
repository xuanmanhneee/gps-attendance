import { useCallback, useEffect, useRef, useState } from 'react';

import { usersApi } from '../api/users.api';
import { toLecturerOptions } from '../utils/attendance-sessions/session-filter';
import type { LecturerOption } from '../utils/attendance-sessions/session-filter';
import { toError } from '../utils/attendance-sessions/session-list';

/**
 * Danh sách lecturer cho bộ lọc phiên điểm danh của admin.
 *
 * Chỉ dùng ở route admin: `GET /v0/users` do backend kiểm soát quyền; hook
 * chỉ lọc role `lecturer` phía client để đổ dropdown. Lỗi tải directory được
 * giữ trong state để UI hiển thị rõ ràng kèm nút thử lại, không nuốt lỗi.
 */
export const useLecturers = () => {
  const [lecturerOptions, setLecturerOptions] = useState<LecturerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadIdRef = useRef(0);

  const reload = useCallback(async () => {
    // Chặn stale response: chỉ request mới nhất được ghi state.
    const requestId = ++loadIdRef.current;
    const isActive = () => loadIdRef.current === requestId;

    setIsLoading(true);
    setError(null);

    try {
      const data: unknown = await usersApi.getAll();

      if (!isActive()) return;

      setLecturerOptions(toLecturerOptions(data));
    } catch (unknownError) {
      if (!isActive()) return;

      setError(
        toError(
          unknownError,
          new Error('Unable to load the lecturer directory'),
        ),
      );
    } finally {
      if (isActive()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return {
    lecturerOptions,
    isLoading,
    error,
    reload,
  };
};