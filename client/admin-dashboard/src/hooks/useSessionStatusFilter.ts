import type { SessionStatus } from '@gps-attendance/shared';
import { useMemo, useState } from 'react';

/**
 * Giá trị filter: `'all'` = tất cả trạng thái "sống" (không gồm cancelled),
 * còn lại là 1 status cụ thể.
 */
export type StatusFilter = Exclude<SessionStatus, 'cancelled'> | 'all';

type SessionWithStatus = { status: SessionStatus };

type Options = {
  /**
   * Nếu `true`, "Tất cả" sẽ bao gồm cả phiên đã huỷ. Mặc định `false` vì
   * cancelled được xem là soft delete — ẩn khỏi danh sách mặc định.
   */
  includeCancelledOnAll?: boolean;
};

export const useSessionStatusFilter = <T extends SessionWithStatus>(
  sessions: T[],
  { includeCancelledOnAll = false }: Options = {},
) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'all') {
      return includeCancelledOnAll
        ? sessions
        : sessions.filter((s) => s.status !== 'cancelled');
    }
    return sessions.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter, includeCancelledOnAll]);

  return { statusFilter, setStatusFilter, filteredSessions };
};
