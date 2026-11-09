export const attendanceSessionCacheKey = (sessionId: number) =>
  `attendance:session:${sessionId}:context`;

export const lecturerVerificationCacheKey = (sessionId: number) =>
  `attendance:session:${sessionId}:lecturer-verification`;
