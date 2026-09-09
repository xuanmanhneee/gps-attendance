import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import type { ApiErrorResponse } from '@gps-attendance/shared';
import { CommonErrorCode } from '@gps-attendance/shared';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let code: typeof CommonErrorCode[keyof typeof CommonErrorCode] = CommonErrorCode.UNKNOWN_ERROR;
      let message = exception.message;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as {
          code?: string;
          message?: string | string[];
        };

        if (body.code && this.isValidErrorCode(body.code)) {
          code = body.code as any;
        }

        if (typeof body.message === 'string') {
          message = body.message;
        }
      }

      const errorResponse: ApiErrorResponse = {
        success: false,
        code,
        message,
      };

      response.status(status).json(errorResponse);
      return;
    }

    response.status(500).json({
      success: false,
      code: CommonErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    } satisfies ApiErrorResponse);
  }

  private isValidErrorCode(code: string): boolean {
    const validCodes = Object.values(CommonErrorCode);
    return validCodes.includes(code as any);
  }
}
