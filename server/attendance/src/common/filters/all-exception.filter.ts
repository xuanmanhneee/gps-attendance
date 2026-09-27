import {
<<<<<<< HEAD
=======
  ExceptionFilter,
  Catch,
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
<<<<<<< HEAD
import type { Response } from 'express';
import { CommonErrorCode, type ApiErrorResponse } from '@gps-attendance/shared';
=======
import { Request, Response } from 'express';
import {
  CommonErrorCode,
  ApiErrorCode,
  ApiErrorResponse,
} from '@gps-attendance/shared';
import { ILogger } from '../logging/logger.interface';
import { ILoggerFactory } from '../logging/logger.factory';
import { LOGGER_FACTORY } from '../logging/logger.token';

interface ErrorPayload {
  code?: ApiErrorCode;
  message?: string;
}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: ILogger;

  constructor(@Inject(LOGGER_FACTORY) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory.create(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
<<<<<<< HEAD
    const response = host.switchToHttp().getResponse<Response>();
=======
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestInfo = `${req.method} ${req.originalUrl}`;
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
<<<<<<< HEAD
      const payload = typeof raw === 'object' && raw !== null
        ? raw as { message?: string | string[]; code?: ApiErrorResponse['code'] }
        : {};
      return response.status(exception.getStatus()).json({
=======

      const payload: ErrorPayload =
        typeof raw === 'object' && raw !== null
          ? (raw as ErrorPayload)
          : { message: raw as string };

      if (status >= 500) {
        this.logger.error(
          `[${status}] ${requestInfo} - ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(`[${status}] ${requestInfo} - ${exception.message}`);
      }

      return res.status(status).json({
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
        success: false,
        code: payload.code ?? CommonErrorCode.UNKNOWN_ERROR,
        message: typeof payload.message === 'string' ? payload.message : exception.message,
      } satisfies ApiErrorResponse);
    }

<<<<<<< HEAD
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
=======
    this.logger.error(
      `[500] ${requestInfo} - ${(exception as Error)?.message ?? 'Unknown error'}`,
      (exception as Error)?.stack,
    );

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
      success: false,
      code: CommonErrorCode.UNKNOWN_ERROR,
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    } satisfies ApiErrorResponse);
  }
<<<<<<< HEAD
=======

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
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
}