import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { WinstonJsonLogger } from '../logging/winston-logger.service';
import { RequestWithId } from '../middleware/request-id.middleware';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new WinstonJsonLogger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<RequestWithId>();
    const res = httpContext.getResponse();

    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = req.requestId || 'unknown';

    // Log request start
    this.logger.log(
      JSON.stringify({
        type: 'HTTP_REQUEST_START',
        requestId,
        method,
        url: originalUrl,
        ip,
        userAgent,
      }),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              type: 'HTTP_REQUEST_COMPLETED',
              requestId,
              method,
              url: originalUrl,
              statusCode: res.statusCode,
              durationMs,
            }),
          );
        },
        error: (err) => {
          const durationMs = Date.now() - startTime;
          const status = err.status || res.statusCode || 500;
          this.logger.error(
            JSON.stringify({
              type: 'HTTP_REQUEST_FAILED',
              requestId,
              method,
              url: originalUrl,
              statusCode: status,
              durationMs,
              errorMessage: err.message,
            }),
            err.stack,
          );
        },
      }),
    );
  }
}
