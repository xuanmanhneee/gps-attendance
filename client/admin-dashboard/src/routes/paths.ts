/**
 * Nguồn duy nhất cho đường dẫn trong dashboard.
 *
 * Không hard-code chuỗi route rải rác trong component.
 */
export const ROUTE_PATHS = {
  login: '/login',
  overview: '/dashboard',
  users: '/users',
  units: '/units',
  tags: '/tags',
  attendanceSessions: '/sessions',
  attendanceSessionDetail: '/sessions/:id',
  attendanceRecords: '/attendance-records',
  statistics: '/statistics',
} as const;

export const buildSessionDetailPath = (sessionId: number): string =>
  `/sessions/${sessionId}`;
