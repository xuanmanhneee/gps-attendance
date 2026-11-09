import { RequestIdMiddleware, RequestWithId } from './request-id.middleware';
import { Response, NextFunction } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('should generate a new UUID if x-request-id is missing', () => {
    const req = { headers: {} } as unknown as RequestWithId;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestStartedAtNs).toBe('bigint');
    expect(typeof req.requestId).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('should preserve incoming x-request-id', () => {
    const customId = 'client-custom-req-id-12345';
    const req = {
      headers: { 'x-request-id': customId },
    } as unknown as RequestWithId;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);

    expect(req.requestId).toBe(customId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', customId);
    expect(next).toHaveBeenCalled();
  });
});
