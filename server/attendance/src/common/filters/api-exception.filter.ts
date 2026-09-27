import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  AttendanceCheckInErrorCode,
  AttendanceRecordErrorCode,
  AttendanceSessionErrorCode,
  AuthErrorCode,
  CommonErrorCode,
  UserErrorCode,
  type ApiErrorResponse,
} from '@gps-attendance/shared';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body =
        typeof raw === 'object' && raw !== null
          ? (raw as { code?: string; message?: string | string[] })
          : {};

      let code: ApiErrorResponse['code'];
      if (body.code && this.isValidErrorCode(body.code)) {
        code = body.code as ApiErrorResponse['code'];
      } else {
        code = this.mapStatusToErrorCode(status);
      }

      let message: string;
      if (Array.isArray(body.message)) {
        message = body.message.join('; ');
      } else if (typeof body.message === 'string') {
        message = body.message;
      } else {
        message = exception.message;
      }

      response
        .status(status)
        .json({ success: false, code, message } satisfies ApiErrorResponse);
      return;
    }

    console.error('[ApiExceptionFilter Error]:', exception);
    response.status(500).json({
      success: false,
      code: CommonErrorCode.INTERNAL_ERROR,
      message: (exception as Error)?.message || 'Internal server error',
    } satisfies ApiErrorResponse);
  }

  private mapStatusToErrorCode(status: number): ApiErrorResponse['code'] {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return CommonErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return CommonErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return CommonErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return CommonErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return CommonErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return CommonErrorCode.TOO_MANY_REQUESTS;
      default:
        return CommonErrorCode.UNKNOWN_ERROR;
    }
  }

  private isValidErrorCode(code: string): boolean {
    const validCodes: string[] = [
      ...Object.values(CommonErrorCode),
      ...Object.values(AuthErrorCode),
      ...Object.values(AttendanceSessionErrorCode),
      ...Object.values(UserErrorCode),
      ...Object.values(AttendanceCheckInErrorCode),
      ...Object.values(AttendanceRecordErrorCode),
    ];
    return validCodes.includes(code);
  }
}