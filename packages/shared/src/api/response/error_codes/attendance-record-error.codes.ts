export const AttendanceRecordErrorCode = {
  NOT_FOUND: 'ATTENDANCE_RECORD_NOT_FOUND',
  ALREADY_EXISTS: 'ATTENDANCE_RECORD_ALREADY_EXISTS',
  INVALID_STATUS: 'ATTENDANCE_RECORD_INVALID_STATUS',
  WRITE_CONFLICT: 'ATTENDANCE_RECORD_WRITE_CONFLICT',
} as const;

export type AttendanceRecordErrorCode =
  (typeof AttendanceRecordErrorCode)[keyof typeof AttendanceRecordErrorCode];
