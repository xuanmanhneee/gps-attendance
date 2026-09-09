import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import {
  CommonErrorCode,
  type ApiErrorResponse,
} from '@gps-attendance/shared';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let code: string = CommonErrorCode.UNKNOWN_ERROR;
      let message = exception.message;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as {
          code?: string;
          message?: string | string[];
        };

        code = body.code ?? code;

        if (typeof body.message === 'string') {
          message = body.message;
        }
      }

      const errorResponse: ApiErrorResponse = {
        success: false,
        code: code as ApiErrorResponse['code'],
        message,
      };

      response.status(status).json(errorResponse);
      return;
    }

    response.status(500).json({
      success: false,
      code: CommonErrorCode.UNKNOWN_ERROR,
      message: 'Internal server error',
    } satisfies ApiErrorResponse);
  }
}
