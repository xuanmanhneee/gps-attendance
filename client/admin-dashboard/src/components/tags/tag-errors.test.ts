import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ApiError, CommonErrorCode } from '@gps-attendance/shared';

import { en } from '../../i18n/translations/en.ts';
import { vi } from '../../i18n/translations/vi.ts';
import {
  getTagApiErrorCode,
  logTagError,
  resolveTagErrorKey,
} from './tag-errors.ts';

const RAW_TECHNICAL_MESSAGE = 'Tag 42 not found in user_tags table';

describe('resolveTagErrorKey', () => {
  it('map ApiError code đã biết sang translation key', () => {
    const error = new ApiError(
      CommonErrorCode.NOT_FOUND,
      RAW_TECHNICAL_MESSAGE,
      404,
    );

    assert.equal(resolveTagErrorKey(error, 'list'), 'tags.error.notFound');
    assert.equal(resolveTagErrorKey(error, 'delete'), 'tags.error.notFound');
  });

  it('dùng message dịch cố định cho lỗi Error thông thường, không lộ raw message', () => {
    const error = new Error(RAW_TECHNICAL_MESSAGE);

    const key = resolveTagErrorKey(error, 'create');

    assert.equal(key, 'tags.createError');
    assert.equal(key.includes('user_tags'), false);
  });

  it('fallback theo ngữ cảnh khi ApiError code chưa được map', () => {
    const domainCode = 'TAG_ALREADY_ASSIGNED' as unknown as
      (typeof CommonErrorCode)[keyof typeof CommonErrorCode];
    const error = new ApiError(domainCode, RAW_TECHNICAL_MESSAGE, 409);

    assert.equal(resolveTagErrorKey(error, 'assignment'), 'tags.assignmentLoadError');
    assert.equal(resolveTagErrorKey(error, 'refresh'), 'tags.refreshError');
  });

  it('map ApiError có code null về fallback của ngữ cảnh', () => {
    const error = new ApiError(null, RAW_TECHNICAL_MESSAGE, 500);

    assert.equal(getTagApiErrorCode(error), null);
    assert.equal(resolveTagErrorKey(error, 'list'), 'tags.loadError');
  });

  it('mọi key trả về đều tồn tại trong dictionary vi và en', () => {
    const samples: [unknown, Parameters<typeof resolveTagErrorKey>[1]][] = [
      [new ApiError(CommonErrorCode.FORBIDDEN, 'raw', 403), 'list'],
      [new ApiError(CommonErrorCode.VALIDATION_ERROR, 'raw', 400), 'create'],
      [new ApiError(CommonErrorCode.CONFLICT, 'raw', 409), 'delete'],
      [new ApiError(CommonErrorCode.UNAUTHORIZED, 'raw', 401), 'assignment'],
      [new ApiError(CommonErrorCode.TOO_MANY_REQUESTS, 'raw', 429), 'directory'],
      [new ApiError(CommonErrorCode.INTERNAL_ERROR, 'raw', 500), 'refresh'],
      [new Error('boom'), 'list'],
      [{ code: 'NOT_FOUND' }, 'create'],
      [null, 'delete'],
    ];

    for (const [error, context] of samples) {
      const key = resolveTagErrorKey(error, context);

      assert.ok(key in vi, `thiếu key ${key} trong vi`);
      assert.ok(key in en, `thiếu key ${key} trong en`);
    }
  });

  it('logTagError chỉ ghi console, không trả message kỹ thuật để render', () => {
    const originalConsoleError = console.error;
    const logged: unknown[] = [];
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    try {
      const error = new Error(RAW_TECHNICAL_MESSAGE);

      assert.equal(logTagError('list', error), undefined);
      assert.equal(logged.length, 1);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
