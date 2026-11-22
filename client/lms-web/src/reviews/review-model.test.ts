import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildResolveBody,
  getResolutionState,
  isHistoryItem,
  isOwnSession,
  isReasonTooLong,
  isReviewCandidate,
  normalizeToken,
  parseList,
  removeCandidate,
} from './review-model.ts';

const candidate = {
  sessionId: 5,
  userId: 9,
  student: { code: 'SV1', fullname: 'An', role: 'participant' },
  reasons: ['MOCK_LOCATION'],
};

test('isReviewCandidate kiểm shape, reasons không rỗng', () => {
  assert.equal(isReviewCandidate(candidate), true);
  assert.equal(isReviewCandidate({ ...candidate, reasons: [] }), false);
  assert.equal(isReviewCandidate({ ...candidate, reasons: ['X'] }), false);
  assert.equal(isReviewCandidate({ ...candidate, userId: 0 }), false);
  assert.equal(isReviewCandidate(null), false);
});

test('parseList: không phải mảng -> null, bỏ item sai và đếm', () => {
  assert.equal(parseList({}, isReviewCandidate), null);
  const r = parseList([candidate, { bad: 1 }], isReviewCandidate);
  assert.equal(r?.items.length, 1);
  assert.equal(r?.dropped, 1);
});

test('isHistoryItem & isOwnSession', () => {
  const h = {
    id: 'a',
    session: { id: 1, title: 'T' },
    student: candidate.student,
    decision: 'approve',
    reasons: [],
    reason: null,
    resolvedAt: '2026-01-01T00:00:00.000Z',
  };
  assert.equal(isHistoryItem(h), true);
  assert.equal(isHistoryItem({ ...h, resolvedAt: 'nope' }), false);
  assert.equal(isHistoryItem({ ...h, decision: 'x' }), false);
  const s = { id: 1, title: 'T', openAt: 'a', closeAt: 'b', status: 'open' };
  assert.equal(isOwnSession(s), true);
  assert.equal(isOwnSession({ ...s, id: '1' }), false);
});

test('getResolutionState: cửa sổ đến closeAt + 10 phút', () => {
  const open = '2026-01-01T00:00:00.000Z';
  const close = '2026-01-01T01:00:00.000Z';
  const t = (iso: string) => Date.parse(iso);
  assert.equal(getResolutionState(open, close, t('2025-12-31T23:59:59Z')), 'not-open');
  assert.equal(getResolutionState(open, close, t('2026-01-01T01:10:00Z')), 'open');
  assert.equal(getResolutionState(open, close, t('2026-01-01T01:10:01Z')), 'closed');
  assert.equal(getResolutionState('bad', close), 'closed');
});

test('buildResolveBody chỉ gửi reason khi có nội dung; giới hạn 500', () => {
  assert.deepEqual(buildResolveBody('approve', '   '), { decision: 'approve' });
  assert.deepEqual(buildResolveBody('reject', ' lý do '), {
    decision: 'reject',
    reason: 'lý do',
  });
  assert.equal(isReasonTooLong('a'.repeat(500)), false);
  assert.equal(isReasonTooLong('a'.repeat(501)), true);
});

test('removeCandidate không mutate', () => {
  const list = [candidate as never];
  assert.equal(removeCandidate(list, 9).length, 0);
  assert.equal(list.length, 1);
});

test('normalizeToken bỏ Bearer và khoảng trắng/xuống dòng', () => {
  assert.equal(normalizeToken('  Bearer aaa.bbb.ccc\n'), 'aaa.bbb.ccc');
  assert.equal(normalizeToken('aaa.\nbbb.ccc'), 'aaa.bbb.ccc');
  assert.equal(normalizeToken('   '), '');
});
