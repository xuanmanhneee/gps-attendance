import type {
  AttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';

export const countSessionsByStatus = (
  sessions: readonly AttendanceSessionResponse[],
): Record<SessionStatus, number> => {
  const counts: Record<SessionStatus, number> = {
    open: 0,
    pending: 0,
    closed: 0,
  };

  for (const session of sessions) {
    counts[session.status] += 1;
  }

  return counts;
};

const isSameDay = (iso: string, reference: Date): boolean => {
  const date = new Date(iso);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
};

export const countSessionsOpenedOn = (
  sessions: readonly AttendanceSessionResponse[],
  reference: Date,
): number =>
  sessions.filter((session) => isSameDay(session.openAt, reference)).length;

/** Phiên mới nhất lên đầu; không mutate mảng gốc. */
export const sortSessionsByOpenAtDesc = (
  sessions: readonly AttendanceSessionResponse[],
): AttendanceSessionResponse[] =>
  [...sessions].sort(
    (a, b) => new Date(b.openAt).getTime() - new Date(a.openAt).getTime(),
  );