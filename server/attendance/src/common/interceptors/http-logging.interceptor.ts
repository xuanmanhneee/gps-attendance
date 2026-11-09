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

    const handlerStartedAtNs = process.hrtime.bigint();
    const requestStartedAtNs = req.requestStartedAtNs ?? handlerStartedAtNs;
    const preHandlerDurationMs =
      Number(handlerStartedAtNs - requestStartedAtNs) / 1_000_000;
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = req.requestId || 'unknown';
    const setLoadTestTimingHeaders = (durationMs: number) => {
      if (
        process.env.NODE_ENV !== 'test' ||
        process.env.LOAD_TEST_MODE !== 'true'
      ) {
        return;
      }

      const requestDurationMs =
        Number(process.hrtime.bigint() - requestStartedAtNs) / 1_000_000;
      res.setHeader(
        'X-Server-Pre-Handler-Duration-Ms',
        preHandlerDurationMs.toFixed(3),
      );
      res.setHeader('X-Server-Handler-Duration-Ms', durationMs.toFixed(3));
      res.setHeader(
        'X-Server-Request-Duration-Ms',
        requestDurationMs.toFixed(3),
      );
    };

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
          setLoadTestTimingHeaders(durationMs);
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
          setLoadTestTimingHeaders(durationMs);
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
