import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const existingId = req.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof existingId === 'string' && existingId.trim().length > 0
        ? existingId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
