import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { CommonErrorCode, type ApiErrorResponse } from '@gps-attendance/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      const payload = typeof raw === 'object' && raw !== null
        ? raw as { message?: string | string[]; code?: ApiErrorResponse['code'] }
        : {};
      return response.status(exception.getStatus()).json({
        success: false,
        code: payload.code ?? CommonErrorCode.UNKNOWN_ERROR,
        message: typeof payload.message === 'string' ? payload.message : exception.message,
      } satisfies ApiErrorResponse);
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: CommonErrorCode.UNKNOWN_ERROR,
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    } satisfies ApiErrorResponse);
  }
}