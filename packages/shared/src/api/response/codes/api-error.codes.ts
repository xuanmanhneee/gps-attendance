// api-error-code.ts — gom tất cả lại
import { CommonErrorCode } from './common.codes';
import { AuthErrorCode } from './auth.codes';
import { AttendanceSessionErrorCode } from './attendance-session.codes';

export type ApiErrorCode =
  typeof CommonErrorCode[keyof typeof CommonErrorCode] | typeof AuthErrorCode[keyof typeof AuthErrorCode] | typeof AttendanceSessionErrorCode[keyof typeof AttendanceSessionErrorCode];
