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
  // ValidationPipe ném message dạng string[] (mỗi phần tử là 1 lỗi của 1 field),
  // không phải string như trước đây giả định.
  message?: string | string[];
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
        typeof raw === 'object' && raw !== null ? raw : { message: raw };

      // `exception.message` của HttpException do ValidationPipe ném ra luôn là
      // chuỗi mặc định "Bad Request Exception" (vì raw message là mảng), nên
      // phải lấy chi tiết từ payload.message thì log mới có ích.
      const detail = this.describeMessage(payload.message, exception.message);

      if (status >= 500) {
        this.logger.error(
          `[${status}] ${requestInfo} - ${detail}`,
          exception.stack,
        );
      } else {
        this.logger.warn(`[${status}] ${requestInfo} - ${detail}`);
      }

      return res.status(status).json({
        success: false,
        code: payload.code ?? this.defaultCodeFor(status),
        message: detail,
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

  // Chuẩn hoá message về 1 string trước khi log/trả về client. ValidationPipe
  // trả mảng lỗi (mỗi field 1 phần tử) nên cần join; nếu trả thẳng mảng thì vừa
  // log vô nghĩa ("Bad Request Exception"), vừa sai contract
  // `ApiErrorResponse.message: string` (docs/conventions/api-response.md).
  private describeMessage(
    message: string | string[] | undefined,
    fallback: string,
  ): string {
    if (Array.isArray(message)) return message.join('; ');
    return message ?? fallback;
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
