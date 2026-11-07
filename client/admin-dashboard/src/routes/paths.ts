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
  attendanceSessionCreate: '/sessions/new',
  attendanceSessionDetail: '/sessions/:id',
  attendanceSessionEdit: '/sessions/:id/edit',
  attendanceRecords: '/attendance-records',
  statistics: '/statistics',
} as const;

export const buildSessionDetailPath = (sessionId: number): string =>
  `/sessions/${sessionId}`;

export const buildSessionEditPath = (sessionId: number): string =>
  `/sessions/${sessionId}/edit`;

/**
 * Trang đầu tiên của từng vai trò sau khi đăng nhập.
 * Organizer không có trang tổng quan: vào thẳng danh sách phiên điểm danh.
 */
export const getHomePath = (role: string | undefined): string =>
  role === 'organizer' ? ROUTE_PATHS.attendanceSessions : ROUTE_PATHS.overview;
