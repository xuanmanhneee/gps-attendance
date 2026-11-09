import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Response } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { HttpLoggingInterceptor } from './http-logging.interceptor';
import { RequestWithId } from '../middleware/request-id.middleware';

jest.mock('../logging/winston-logger.service', () => ({
  WinstonJsonLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('HttpLoggingInterceptor', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLoadTestMode = process.env.LOAD_TEST_MODE;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalLoadTestMode === undefined) {
      delete process.env.LOAD_TEST_MODE;
    } else {
      process.env.LOAD_TEST_MODE = originalLoadTestMode;
    }
  });

  it('sets API timing headers only in load-test mode', async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOAD_TEST_MODE = 'true';
    const request: RequestWithId = {
      requestId: 'test-request',
      requestStartedAtNs: process.hrtime.bigint() - 3_000_000n,
      method: 'POST',
      originalUrl: '/v0/attendance/check-in',
      ip: '127.0.0.1',
      headers: {},
    } as unknown as RequestWithId;
    const response = {
      statusCode: 200,
      setHeader: jest.fn(),
    } as unknown as Response;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const handler = { handle: () => of({ success: true }) } as CallHandler;

    await firstValueFrom(
      new HttpLoggingInterceptor().intercept(context, handler),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Server-Pre-Handler-Duration-Ms',
      expect.stringMatching(/^\d+\.\d{3}$/),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Server-Handler-Duration-Ms',
      expect.stringMatching(/^\d+\.\d{3}$/),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Server-Request-Duration-Ms',
      expect.stringMatching(/^\d+\.\d{3}$/),
    );
  });

  it('does not expose timing headers outside load-test mode', async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOAD_TEST_MODE = 'false';
    const request = {
      method: 'POST',
      originalUrl: '/v0/attendance/check-in',
      ip: '127.0.0.1',
      headers: {},
    } as unknown as RequestWithId;
    const response = {
      statusCode: 200,
      setHeader: jest.fn(),
    } as unknown as Response;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const handler = { handle: () => of({ success: true }) } as CallHandler;

    await firstValueFrom(
      new HttpLoggingInterceptor().intercept(context, handler),
    );

    expect(response.setHeader).not.toHaveBeenCalledWith(
      'X-Server-Request-Duration-Ms',
      expect.anything(),
    );
  });
});
