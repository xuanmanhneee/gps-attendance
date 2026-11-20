import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { en } from '../i18n/translations/en.ts';
import { vi } from '../i18n/translations/vi.ts';
import {
  ATTENDANCE_REVIEW_REASON_LABEL_KEYS,
  getReviewResolutionState,
} from './attendance-review.ts';

describe('ATTENDANCE_REVIEW_REASON_LABEL_KEYS', () => {
  it('mọi reason backend đều có nhãn ở cả vi và en', () => {
    assert.deepEqual(Object.keys(ATTENDANCE_REVIEW_REASON_LABEL_KEYS).sort(), [
      'INVALID_LOCATION_TIMESTAMP',
      'LOW_CONFIDENCE_SCORE',
      'MOCK_LOCATION',
      'OUT_OF_RANGE',
    ]);

    for (const key of Object.values(ATTENDANCE_REVIEW_REASON_LABEL_KEYS)) {
      assert.ok(key in vi, `thiếu key ${key} trong vi`);
      assert.ok(key in en, `thiếu key ${key} trong en`);
    }
  });
});

describe('getReviewResolutionState', () => {
  const openAt = '2026-11-07T08:00:00.000Z';
  const closeAt = '2026-11-07T09:00:00.000Z';

  it('chỉ mở từ openAt đến hết 10 phút sau closeAt', () => {
    assert.equal(
      getReviewResolutionState(
        openAt,
        closeAt,
        Date.parse('2026-11-07T07:59:59.999Z'),
      ),
      'not-open',
    );
    assert.equal(
      getReviewResolutionState(openAt, closeAt, Date.parse(openAt)),
      'open',
    );
    assert.equal(
      getReviewResolutionState(
        openAt,
        closeAt,
        Date.parse('2026-11-07T09:10:00.000Z'),
      ),
      'open',
    );
    assert.equal(
      getReviewResolutionState(
        openAt,
        closeAt,
        Date.parse('2026-11-07T09:10:00.001Z'),
      ),
      'closed',
    );
  });

  it('đóng an toàn khi timestamp từ API không hợp lệ', () => {
    assert.equal(getReviewResolutionState('bad', closeAt), 'closed');
    assert.equal(getReviewResolutionState(openAt, 'bad'), 'closed');
  });
});
