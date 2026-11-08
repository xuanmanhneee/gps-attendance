import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { parseAttendanceSessionList } from '../types/attendance-session';
import { createLoadTracker } from '../utils/attendance-sessions/session-filter';
import { toError } from '../utils/attendance-sessions/session-list';

/**
 * `all` — toàn bộ phiên (route admin, mặc định).
 * `created-by-me` — chỉ phiên do user hiện tại tạo; chỉ dùng ở page organizer vì
 * endpoint phía sau yêu cầu role organizer.
 * `created-by` — phiên do một organizer cụ thể tạo; chỉ dùng khi UI admin cần
 * lọc theo organizer vì endpoint phía sau yêu cầu role admin.
 */
type AttendanceSessionScope = 'all' | 'created-by-me' | 'created-by';

interface UseAttendanceSessionsOptions {
  scope?: AttendanceSessionScope;
  /** Bắt buộc khi `scope` là `created-by`: id của organizer cần lọc. */
  createdByUserId?: number;
  /**
   * `false` khi bộ lọc chưa hợp lệ: hook không gọi API nào và trả `isLoading`
   * bằng `false` (giá trị suy ra từ `enabled`, không setState trong effect).
   * Mặc định `true` để giữ nguyên behavior cũ cho các nơi dùng hiện tại.
   */
  enabled?: boolean;
}

export const useAttendanceSessions = (
  options: UseAttendanceSessionsOptions = {},
) => {
  const { scope = 'all', createdByUserId, enabled = true } = options;

  const [sessions, setSessions] = useState<AttendanceSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  /** Chỉ request mới nhất được phép ghi state (chặn stale response). */
  const loadTrackerRef = useRef(createLoadTracker());
  /** Nhận diện phạm vi hiện tại để xoá dữ liệu cũ khi đổi scope/organizer. */
  const scopeKeyRef = useRef(`${scope}:${createdByUserId ?? ''}`);

  const loadSessions = useCallback(
    async (fresh = false): Promise<AttendanceSessionResponse[]> => {
      if (scope === 'created-by-me') {
        const data: unknown = await attendanceSessionsApi.getCreatedByMe(fresh);

        // Kiểm tra shape trước khi ghi state: không biến payload lạ thành thành công.
        const list = parseAttendanceSessionList(data);

        if (list === null) {
          throw new Error('Unexpected attendance session list response');
        }

        return list;
      }

      if (scope === 'created-by') {
        if (
          createdByUserId === undefined ||
          !Number.isInteger(createdByUserId) ||
          createdByUserId <= 0
        ) {
          throw new Error(
            'Missing organizer user id for attendance session filter',
          );
        }

        const data: unknown = await attendanceSessionsApi.getCreatedBy(
          createdByUserId,
          fresh,
        );

        // Kiểm tra shape trước khi ghi state: không biến payload lạ thành thành công.
        const list = parseAttendanceSessionList(data);

        if (list === null) {
          throw new Error('Unexpected attendance session list response');
        }

        return list;
      }

      const data: unknown = await attendanceSessionsApi.getAll(fresh);

      // Kiểm tra shape trước khi ghi state: không biến payload lạ thành thành công.
      const list = parseAttendanceSessionList(data);

      if (list === null) {
        throw new Error('Unexpected attendance session list response');
      }

      return list;
    },
    [scope, createdByUserId],
  );

  const reload = useCallback(
    async (fresh = true) => {
      const tracker = loadTrackerRef.current;
      const requestId = tracker.begin();

      // Đổi phạm vi (vd chọn organizer khác): xoá dữ liệu phạm vi cũ ngay từ đầu
      // để request mới thất bại không bị nhìn nhầm là dữ liệu của organizer cũ.
      const scopeKey = `${scope}:${createdByUserId ?? ''}`;

      if (scopeKeyRef.current !== scopeKey) {
        scopeKeyRef.current = scopeKey;
        setSessions([]);
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await loadSessions(fresh);

        // Request cũ hoàn thành sau khi đã đổi phạm vi: bỏ qua, không ghi state.
        if (!tracker.isActive(requestId)) return;

        setSessions(data);
      } catch (unknownError) {
        if (!tracker.isActive(requestId)) return;

        // Giữ danh sách hiện có của phạm vi hiện tại; lỗi không được biến thành
        // dữ liệu của phạm vi khác (đã xoá khi đổi phạm vi ở trên).
        setError(
          toError(
            unknownError,
            new Error('Unable to load attendance sessions'),
          ),
        );
      } finally {
        // Request cũ kết thúc muộn không được tắt loading của request mới.
        if (tracker.isActive(requestId)) setIsLoading(false);
      }
    },
    [loadSessions, scope, createdByUserId],
  );

  useEffect(() => {
    // Bộ lọc chưa hợp lệ: không gọi API nào. Loading được suy ra từ `enabled`
    // ở giá trị trả về nên không cần setState ở đây (tránh cascading render).
    if (!enabled) return;

    // Fetch khi mount/đổi scope: `reload()` bật loading ngay (đồng bộ) rồi mới
    // `await`, nên rule báo cascading render — đây là chủ ý, giống các hook khác
    // trong repo, nên tắt rule cho đúng dòng gọi này.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
  }, [reload, enabled]);

  return {
    sessions,
    // Bộ lọc chưa hợp lệ thì coi như không loading: suy ra từ `enabled` thay vì
    // setState trong effect.
    isLoading: enabled ? isLoading : false,
    error,
    reload,
  };
};
