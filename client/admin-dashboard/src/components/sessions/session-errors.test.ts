import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiError,
  AttendanceSessionErrorCode,
  CommonErrorCode,
} from '@gps-attendance/shared';

import { en } from '../../i18n/translations/en.ts';
import { vi } from '../../i18n/translations/vi.ts';
import {
  getSessionApiErrorCode,
  logSessionError,
  resolveSessionErrorKey,
} from './session-errors.ts';

const RAW_TECHNICAL_MESSAGE = 'Attendance session 42 violates fk_participant';

describe('resolveSessionErrorKey', () => {
  it('map ApiError common code Ä‘Ã£ biáº¿t sang translation key', () => {
    const error = new ApiError(
      CommonErrorCode.NOT_FOUND,
      RAW_TECHNICAL_MESSAGE,
      404,
    );

    assert.equal(resolveSessionErrorKey(error, 'list'), 'sessions.error.notFound');
    assert.equal(
      resolveSessionErrorKey(error, 'detail'),
      'sessions.error.notFound',
    );
  });

  it('map domain code cá»§a attendance-session', () => {
    const forbidden = new ApiError(
      AttendanceSessionErrorCode.FORBIDDEN,
      RAW_TECHNICAL_MESSAGE,
      403,
    );
    const timeRange = new ApiError(
      AttendanceSessionErrorCode.INVALID_TIME_RANGE,
      RAW_TECHNICAL_MESSAGE,
      400,
    );

    assert.equal(
      resolveSessionErrorKey(forbidden, 'list'),
      'sessions.error.forbidden',
    );
    assert.equal(
      resolveSessionErrorKey(timeRange, 'create'),
      'sessions.error.invalidTimeRange',
    );
  });

  it('dÃ¹ng message dá»‹ch cá»‘ Ä‘á»‹nh cho lá»—i Error thÃ´ng thÆ°á»ng, khÃ´ng lá»™ raw message', () => {
    const error = new Error(RAW_TECHNICAL_MESSAGE);

    const key = resolveSessionErrorKey(error, 'create');

    assert.equal(key, 'sessions.createError');
    assert.equal(key.includes('fk_participant'), false);
  });

  it('fallback theo ngá»¯ cáº£nh khi ApiError code chÆ°a Ä‘Æ°á»£c map hoáº·c null', () => {
    const domainCode = 'SESSION_ALREADY_ARCHIVED' as unknown as
      (typeof CommonErrorCode)[keyof typeof CommonErrorCode];

    assert.equal(
      resolveSessionErrorKey(new ApiError(domainCode, 'raw', 409), 'list'),
      'sessions.loadError',
    );
    assert.equal(
      resolveSessionErrorKey(new ApiError(domainCode, 'raw', 409), 'detail'),
      'sessionDetail.loadError',
    );
    assert.equal(
      resolveSessionErrorKey(new ApiError(null, 'raw', 500), 'create'),
      'sessions.createError',
    );
  });

  it('má»i key tráº£ vá» Ä‘á»u tá»“n táº¡i trong dictionary vi vÃ  en', () => {
    const samples: [unknown, Parameters<typeof resolveSessionErrorKey>[1]][] = [
      [new ApiError(CommonErrorCode.FORBIDDEN, 'raw', 403), 'list'],
      [new ApiError(CommonErrorCode.VALIDATION_ERROR, 'raw', 400), 'create'],
      [new ApiError(CommonErrorCode.UNAUTHORIZED, 'raw', 401), 'detail'],
      [new ApiError(CommonErrorCode.CONFLICT, 'raw', 409), 'create'],
      [new ApiError(CommonErrorCode.TOO_MANY_REQUESTS, 'raw', 429), 'list'],
      [new ApiError(CommonErrorCode.INTERNAL_ERROR, 'raw', 500), 'detail'],
      [
        AttendanceSessionErrorCode.INVALID_RADIUS,
        'create',
      ],
      [new Error('boom'), 'list'],
      [{ code: 'NOT_FOUND' }, 'create'],
      [null, 'detail'],
    ];

    for (const [error, context] of samples) {
      const key = resolveSessionErrorKey(error, context);

      assert.ok(key in vi, `thiáº¿u key ${key} trong vi`);
      assert.ok(key in en, `thiáº¿u key ${key} trong en`);
    }
  });
});

describe('getSessionApiErrorCode', () => {
  it('chá»‰ láº¥y code tá»« ApiError, bá» qua kiá»ƒu lá»—i khÃ¡c', () => {
    const error = new ApiError(CommonErrorCode.NOT_FOUND, 'raw', 404);

    assert.equal(getSessionApiErrorCode(error), CommonErrorCode.NOT_FOUND);
    assert.equal(getSessionApiErrorCode(new Error('boom')), null);
  });
});

describe('logSessionError', () => {
  it('chá»‰ ghi console, khÃ´ng tráº£ message ká»¹ thuáº­t Ä‘á»ƒ render', () => {
    const originalConsoleError = console.error;
    const logged: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    try {
      assert.equal(logSessionError('create', new Error(RAW_TECHNICAL_MESSAGE)), undefined);
      assert.equal(logged.length, 1);
    } finally {
      console.error = originalConsoleError;
    }
  });
});

