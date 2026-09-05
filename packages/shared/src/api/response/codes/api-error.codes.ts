// api-error-code.ts — gom tất cả lại
import { CommonErrorCode } from './common.codes';
import { AuthErrorCode } from './auth.codes';
import { AttendanceSessionErrorCode } from './attendance-session.codes';

export type ApiErrorCode =
  CommonErrorCode | AuthErrorCode | AttendanceSessionErrorCode;
