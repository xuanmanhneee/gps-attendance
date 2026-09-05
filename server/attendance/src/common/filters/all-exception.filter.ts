import {
  CommonErrorCode,
  ApiErrorCode,
  ApiErrorResponse,
} from '@gps-attendance/shared';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorPayload {
  code?: ApiErrorCode;
  message?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      const payload: ErrorPayload =
        typeof raw === 'object' && raw !== null
          ? (raw as ErrorPayload)
          : { message: raw as string };

      return res.status(status).json({
        success: false,
        code: payload.code ?? this.defaultCodeFor(status),
        message: payload.message ?? exception.message,
      } satisfies ApiErrorResponse);
    }

    console.error(exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: CommonErrorCode.INTERNAL_ERROR,
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    } satisfies ApiErrorResponse);
  }

  private defaultCodeFor(status: number): CommonErrorCode {
    const map: Record<number, CommonErrorCode> = {
      400: CommonErrorCode.VALIDATION_ERROR,
      401: CommonErrorCode.UNAUTHORIZED,
      403: CommonErrorCode.FORBIDDEN,
      404: CommonErrorCode.NOT_FOUND,
      409: CommonErrorCode.CONFLICT,
      429: CommonErrorCode.TOO_MANY_REQUESTS,
    };
    return map[status] ?? CommonErrorCode.UNKNOWN_ERROR;
  }
}
