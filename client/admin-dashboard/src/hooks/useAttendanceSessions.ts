import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import {
  isAttendanceSession,
  parseAttendanceSessionList,
} from '../types/attendance-session';
import type { CreateSessionFormData } from '../types/attendance-session';
import { createLoadTracker } from '../utils/attendance-sessions/session-filter';
import {
  applySessionCreated,
  toError,
} from '../utils/attendance-sessions/session-list';

/**
 * `all` — toàn bộ phiên (route admin, mặc định).
 * `created-by-me` — chỉ phiên do user hiện tại tạo; chỉ dùng ở page lecturer vì
 * endpoint phía sau yêu cầu role lecturer.
 * `created-by` — phiên do một lecturer cụ thể tạo; chỉ dùng khi UI admin cần
 * lọc theo lecturer vì endpoint phía sau yêu cầu role admin.
 */
type AttendanceSessionScope = 'all' | 'created-by-me' | 'created-by';

interface UseAttendanceSessionsOptions {
  scope?: AttendanceSessionScope;
  /** Bắt buộc khi `scope` là `created-by`: id của lecturer cần lọc. */
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
  const {
    scope = 'all',
    createdByUserId,
    enabled = true,
  } = options;

  const [sessions, setSessions] = useState<AttendanceSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createInFlightRef = useRef<Promise<void> | null>(null);
  /** Chỉ request mới nhất được phép ghi state (chặn stale response). */
  const loadTrackerRef = useRef(createLoadTracker());
  /** Nhận diện phạm vi hiện tại để xoá dữ liệu cũ khi đổi scope/lecturer. */
  const scopeKeyRef = useRef(`${scope}:${createdByUserId ?? ''}`);

  const loadSessions = useCallback(async (): Promise<
    AttendanceSessionResponse[]
  > => {
    if (scope === 'created-by-me') {
      const data: unknown = await attendanceSessionsApi.getCreatedByMe();

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
        throw new Error('Missing lecturer user id for attendance session filter');
      }

      const data: unknown =
        await attendanceSessionsApi.getCreatedBy(createdByUserId);

      // Kiểm tra shape trước khi ghi state: không biến payload lạ thành thành công.
      const list = parseAttendanceSessionList(data);

      if (list === null) {
        throw new Error('Unexpected attendance session list response');
      }

      return list;
    }

    const data: unknown = await attendanceSessionsApi.getAll();

    // Kiểm tra shape trước khi ghi state: không biến payload lạ thành thành công.
    const list = parseAttendanceSessionList(data);

    if (list === null) {
      throw new Error('Unexpected attendance session list response');
    }

    return list;
  }, [scope, createdByUserId]);

  const reload = useCallback(async () => {
    const tracker = loadTrackerRef.current;
    const requestId = tracker.begin();

    // Đổi phạm vi (vd chọn lecturer khác): xoá dữ liệu phạm vi cũ ngay từ đầu
    // để request mới thất bại không bị nhìn nhầm là dữ liệu của lecturer cũ.
    const scopeKey = `${scope}:${createdByUserId ?? ''}`;

    if (scopeKeyRef.current !== scopeKey) {
      scopeKeyRef.current = scopeKey;
      setSessions([]);
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await loadSessions();

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
  }, [loadSessions, scope, createdByUserId]);

  useEffect(() => {
    // Bộ lọc chưa hợp lệ: không gọi API nào. Loading được suy ra từ `enabled`
    // ở giá trị trả về nên không cần setState ở đây (tránh cascading render).
    if (!enabled) return;

    // Fetch khi mount/đổi scope: `reload()` bật loading ngay (đồng bộ) rồi mới
    // `await`, nên rule báo cascading render — đây là chủ ý, giống các hook khác
    // trong repo, nên tắt rule cho đúng dòng gọi này.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload, enabled]);

  const createSession = useCallback(
    async (data: CreateSessionFormData): Promise<void> => {
      // Chặn submit lặp: nếu request đang chạy thì dùng lại chính request đó
      // thay vì POST thêm một phiên trùng.
      const inFlight = createInFlightRef.current;

      if (inFlight) return inFlight;

      const request = (async () => {
        setIsCreating(true);

        try {
          const created: unknown = await attendanceSessionsApi.create(data);

          if (!isAttendanceSession(created)) {
            throw new Error('Unexpected attendance session response');
          }

          setSessions((previous) => applySessionCreated(previous, created));
        } finally {
          setIsCreating(false);
        }
      })();

      createInFlightRef.current = request;

      try {
        await request;
      } finally {
        createInFlightRef.current = null;
      }
    },
    [],
  );

  return {
    sessions,
    // Bộ lọc chưa hợp lệ thì coi như không loading: suy ra từ `enabled` thay vì
    // setState trong effect.
    isLoading: enabled ? isLoading : false,
    error,
    isCreating,
    createSession,
    reload,
  };
};
