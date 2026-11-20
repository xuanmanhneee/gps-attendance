import { useCallback, useEffect, useState } from 'react';

import type { AttendanceReviewHistoryResponse } from '@gps-attendance/shared';

import { attendanceReviewsApi } from '../api/attendance-reviews.api';
import { parseAttendanceReviewHistory } from '../types/attendance-review';
import { toError } from '../utils/attendance-sessions/session-list';

export const useAttendanceReviewHistory = (enabled: boolean) => {
  const [items, setItems] = useState<AttendanceReviewHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(
    async (fresh = true) => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);
      try {
        const response: unknown = await attendanceReviewsApi.history(fresh);
        const history = parseAttendanceReviewHistory(response);
        if (!history) {
          throw new Error('Unexpected attendance review history response');
        }
        setItems(history);
      } catch (unknownError) {
        setError(
          toError(
            unknownError,
            new Error('Unable to load attendance review history'),
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (enabled) void reload(false);
  }, [enabled, reload]);

  return { items, isLoading, error, reload };
};
