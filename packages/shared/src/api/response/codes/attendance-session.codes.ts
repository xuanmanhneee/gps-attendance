// attendance-session-error.codes.ts
export const AttendanceSessionErrorCode = {
  NOT_FOUND: 'ATTENDANCE_SESSION_NOT_FOUND',
  INVALID_TIME_RANGE: 'ATTENDANCE_SESSION_INVALID_TIME_RANGE',
  INVALID_RADIUS: 'ATTENDANCE_SESSION_INVALID_RADIUS',
  CREATION_FORBIDDEN: 'ATTENDANCE_SESSION_CREATION_FORBIDDEN',
} as const;

export type AttendanceSessionErrorCode =
  (typeof AttendanceSessionErrorCode)[keyof typeof AttendanceSessionErrorCode];
