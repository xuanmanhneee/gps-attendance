import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttendanceSessionDetailResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { isAttendanceSessionDetail } from '../types/attendance-session';
import { toError } from '../utils/attendance-sessions/session-list';

export const useAttendanceSessionDetail = (sessionId: number | null) => {
  const [detail, setDetail] = useState<AttendanceSessionDetailResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorSessionId, setErrorSessionId] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(
    async (fresh = true) => {
      if (sessionId === null) return;

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);
      setErrorSessionId(null);

      try {
        const response: unknown = await attendanceSessionsApi.getDetail(
          sessionId,
          fresh,
        );

        if (!isAttendanceSessionDetail(response)) {
          throw new Error('Unexpected attendance session detail response');
        }

        if (requestIdRef.current === requestId) setDetail(response);
      } catch (unknownError) {
        if (requestIdRef.current === requestId) {
          setError(
            toError(
              unknownError,
              new Error('Unable to load attendance records'),
            ),
          );
          setErrorSessionId(sessionId);
        }
      } finally {
        if (requestIdRef.current === requestId) setIsLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (sessionId === null) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);

    return () => {
      requestIdRef.current += 1;
    };
  }, [reload, sessionId]);

  const currentDetail = detail?.id === sessionId ? detail : null;
  const currentError = errorSessionId === sessionId ? error : null;

  return {
    detail: currentDetail,
    isLoading:
      sessionId !== null &&
      (isLoading || currentDetail === null) &&
      !currentError,
    error: currentError,
    reload,
  };
};
