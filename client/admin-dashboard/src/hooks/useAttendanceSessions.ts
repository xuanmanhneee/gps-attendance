import { useCallback, useEffect, useState } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import type { CreateSessionFormData } from '../types/attendance-session';

/**
 * `all` — toàn bộ phiên (route admin, mặc định).
 * `created-by-me` — chỉ phiên do user hiện tại tạo; chỉ dùng ở page lecturer vì
 * endpoint phía sau yêu cầu role lecturer.
 */
type AttendanceSessionScope = 'all' | 'created-by-me';

interface UseAttendanceSessionsOptions {
  scope?: AttendanceSessionScope;
}

export const useAttendanceSessions = (
  options: UseAttendanceSessionsOptions = {},
) => {
  const { scope = 'all' } = options;

  const [sessions, setSessions] = useState<AttendanceSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const data =
        scope === 'created-by-me'
          ? await attendanceSessionsApi.getCreatedByMe()
          : await attendanceSessionsApi.getAll();

      setSessions(data);
      setHasError(false);
    } catch {
      // Không giữ lại dữ liệu cũ và không im lặng bỏ qua lỗi.
      setSessions([]);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    // Fetch khi mount; setState trong loadSessions nằm sau `await` nên không
    // gây cascading render như rule suy đoán.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, [loadSessions]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    await loadSessions();
  }, [loadSessions]);

  const createSession = async (data: CreateSessionFormData) => {
    const created = await attendanceSessionsApi.create(data);

    if (!created || typeof created.id !== 'number') {
      throw new Error('Server không trả về dữ liệu session hợp lệ sau khi tạo');
    }

    setSessions((prev) => [created, ...prev]);
  };

  return {
    sessions,
    isLoading,
    hasError,
    createSession,
    reload,
  };
};
