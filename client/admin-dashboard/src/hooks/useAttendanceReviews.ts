import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewDecision,
} from '@gps-attendance/shared';

import { attendanceReviewsApi } from '../api/attendance-reviews.api';
import { parseAttendanceReviewCandidates } from '../types/attendance-review';
import { toError } from '../utils/attendance-sessions/session-list';

type CandidateState = {
  sessionId: number;
  items: AttendanceReviewCandidateResponse[];
};

type SessionErrorState = {
  sessionId: number;
  error: Error;
};

export const useAttendanceReviews = (
  sessionId: number | null,
  enabled: boolean,
) => {
  const [candidateState, setCandidateState] = useState<CandidateState | null>(
    null,
  );
  const [errorState, setErrorState] = useState<SessionErrorState | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);
  const [resolving, setResolving] = useState<{
    sessionId: number;
    userId: number;
  } | null>(null);
  const requestIdRef = useRef(0);
  const mutationInFlightRef = useRef(false);

  const reload = useCallback(
    async (fresh = true) => {
      if (!enabled || sessionId === null) return;

      const requestId = ++requestIdRef.current;
      setLoadingSessionId(sessionId);
      setErrorState(null);

      try {
        const response: unknown = await attendanceReviewsApi.list(
          sessionId,
          fresh,
        );
        const candidates = parseAttendanceReviewCandidates(response);

        if (!candidates) {
          throw new Error('Unexpected attendance review response');
        }

        if (requestIdRef.current === requestId) {
          setCandidateState({ sessionId, items: candidates });
        }
      } catch (unknownError) {
        if (requestIdRef.current === requestId) {
          setErrorState({
            sessionId,
            error: toError(
              unknownError,
              new Error('Unable to load attendance reviews'),
            ),
          });
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoadingSessionId(null);
        }
      }
    },
    [enabled, sessionId],
  );

  useEffect(() => {
    if (!enabled || sessionId === null) {
      requestIdRef.current += 1;
      return;
    }

    void reload(false);

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, reload, sessionId]);

  const resolveCandidate = useCallback(
    async (
      userId: number,
      decision: AttendanceReviewDecision,
      reason?: string,
    ) => {
      if (!enabled || sessionId === null || mutationInFlightRef.current) {
        return;
      }

      mutationInFlightRef.current = true;
      setResolving({ sessionId, userId });

      try {
        await attendanceReviewsApi.resolve(sessionId, userId, {
          decision,
          ...(reason ? { reason } : {}),
        });

        setCandidateState((current) =>
          current?.sessionId === sessionId
            ? {
                sessionId,
                items: current.items.filter(
                  (candidate) => candidate.userId !== userId,
                ),
              }
            : current,
        );
      } finally {
        mutationInFlightRef.current = false;
        setResolving(null);
      }
    },
    [enabled, sessionId],
  );

  const candidates =
    candidateState?.sessionId === sessionId ? candidateState.items : [];
  const error = errorState?.sessionId === sessionId ? errorState.error : null;

  return {
    candidates,
    isLoading:
      enabled &&
      sessionId !== null &&
      loadingSessionId === sessionId &&
      candidateState?.sessionId !== sessionId,
    isRefreshing: loadingSessionId === sessionId,
    error,
    resolvingUserId:
      resolving?.sessionId === sessionId ? resolving.userId : null,
    reload,
    resolveCandidate,
  };
};
