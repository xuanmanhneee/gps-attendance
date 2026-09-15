import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: ILogger;

  constructor(@Inject(LOGGER_FACTORY) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory.create(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestInfo = `${req.method} ${req.originalUrl}`;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

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
        success: false,
        code: payload.code ?? this.defaultCodeFor(status),
        message: payload.message ?? exception.message,
      } satisfies ApiErrorResponse);
    }

    this.logger.error(
      `[500] ${requestInfo} - ${(exception as Error)?.message ?? 'Unknown error'}`,
      (exception as Error)?.stack,
    );

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