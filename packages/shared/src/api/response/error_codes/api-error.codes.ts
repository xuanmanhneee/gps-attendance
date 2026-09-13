import { CommonErrorCode } from './common-error.codes';
import { AuthErrorCode } from './auth-error.codes';
import { AttendanceSessionErrorCode } from './attendance-session-error.codes';
import { UserErrorCode } from './user-error.codes';
import { AttendanceCheckInErrorCode } from './attendance-check-in-error.codes';
import { AttendanceRecordErrorCode } from './attendance-record-error.codes';

export type ApiErrorCode =
  | (typeof CommonErrorCode)[keyof typeof CommonErrorCode]
  | (typeof AuthErrorCode)[keyof typeof AuthErrorCode]
  | (typeof AttendanceSessionErrorCode)[keyof typeof AttendanceSessionErrorCode]
  | (typeof UserErrorCode)[keyof typeof UserErrorCode]
  | (typeof AttendanceCheckInErrorCode)[keyof typeof AttendanceCheckInErrorCode]
  | (typeof AttendanceRecordErrorCode)[keyof typeof AttendanceRecordErrorCode];
