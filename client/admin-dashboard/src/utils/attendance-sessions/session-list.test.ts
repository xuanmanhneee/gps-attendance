import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import {
  applySessionCreated,
  resolveSessionListState,
  shouldShowSessionStaleError,
  toError,
} from './session-list.ts';

const buildSession = (id: number): AttendanceSessionResponse => ({
  id,
  title: `PhiÃªn ${id}`,
  latitude: 21,
  longitude: 105.8,
  radius: 50,
  openAt: '2026-09-20T08:00:00.000Z',
  closeAt: '2026-09-20T10:00:00.000Z',
  status: 'open',
});

describe('applySessionCreated', () => {
  it('thÃªm phiÃªn má»›i lÃªn Ä‘áº§u mÃ  khÃ´ng mutate máº£ng cÅ©', () => {
    const current = [buildSession(1)];
    const created = buildSession(2);

    const next = applySessionCreated(current, created);

    assert.deepEqual(next.map((session) => session.id), [2, 1]);
    assert.deepEqual(current.map((session) => session.id), [1]);
    assert.notEqual(next, current);
  });

  it('upsert theo id: gá»i láº¡i vá»›i phiÃªn Ä‘Ã£ cÃ³ khÃ´ng táº¡o duplicate', () => {
    const current = [buildSession(1), buildSession(2)];

    const next = applySessionCreated(current, buildSession(1));

    assert.deepEqual(next.map((session) => session.id), [1, 2]);
    assert.equal(next.length, 2);
  });
});

describe('resolveSessionListState', () => {
  it('loading khi danh sÃ¡ch rá»—ng vÃ  Ä‘ang táº£i', () => {
    assert.equal(
      resolveSessionListState({ sessionCount: 0, isLoading: true, error: null }),
      'loading',
    );
  });

  it('error khi danh sÃ¡ch rá»—ng vÃ  request lá»—i', () => {
    assert.equal(
      resolveSessionListState({
        sessionCount: 0,
        isLoading: false,
        error: new Error('boom'),
      }),
      'error',
    );
  });

  it('empty khi danh sÃ¡ch rá»—ng, khÃ´ng loading, khÃ´ng lá»—i', () => {
    assert.equal(
      resolveSessionListState({ sessionCount: 0, isLoading: false, error: null }),
      'empty',
    );
  });

  it('Æ°u tiÃªn dá»¯ liá»‡u cÅ©: cÃ²n session thÃ¬ luÃ´n ready dÃ¹ Ä‘ang reload hoáº·c lá»—i', () => {
    assert.equal(
      resolveSessionListState({ sessionCount: 3, isLoading: true, error: null }),
      'ready',
    );
    assert.equal(
      resolveSessionListState({
        sessionCount: 3,
        isLoading: true,
        error: new Error('boom'),
      }),
      'ready',
    );
  });
});

describe('shouldShowSessionStaleError', () => {
  it('chá»‰ cáº£nh bÃ¡o stale khi cÃ²n dá»¯ liá»‡u vÃ  cÃ³ lá»—i reload', () => {
    assert.equal(
      shouldShowSessionStaleError({
        sessionCount: 3,
        error: new Error('boom'),
      }),
      true,
    );
    assert.equal(shouldShowSessionStaleError({ sessionCount: 0, error: new Error('boom') }), false);
    assert.equal(shouldShowSessionStaleError({ sessionCount: 3, error: null }), false);
  });
});

describe('toError', () => {
  it('giá»¯ nguyÃªn Error vÃ  dÃ¹ng fallback cho non-Error', () => {
    const fallback = new Error('fallback');
    const real = new Error('real');

    assert.equal(toError(real, fallback), real);
    assert.equal(toError('boom', fallback), fallback);
    assert.equal(toError(null, fallback), fallback);
  });
});

