import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import {
  AttendanceSessionErrorCode,
  AuthErrorCode,
  CommonErrorCode,
  type ApiErrorResponse,
} from '@gps-attendance/shared';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body = typeof raw === 'object' && raw !== null
        ? (raw as { code?: string; message?: string | string[] })
        : {};
      const code = body.code && this.isValidErrorCode(body.code)
        ? body.code as ApiErrorResponse['code']
        : CommonErrorCode.UNKNOWN_ERROR;
      const message = typeof body.message === 'string'
        ? body.message
        : exception.message;

      response.status(status).json({ success: false, code, message } satisfies ApiErrorResponse);
      return;
    }

    response.status(500).json({
      success: false,
      code: CommonErrorCode.UNKNOWN_ERROR,
      message: 'Internal server error',
    } satisfies ApiErrorResponse);
  }

  private isValidErrorCode(code: string): boolean {
    const validCodes = [
      ...Object.values(CommonErrorCode),
      ...Object.values(AuthErrorCode),
      ...Object.values(AttendanceSessionErrorCode),
    ];
    return validCodes.includes(code as never);
  }
}