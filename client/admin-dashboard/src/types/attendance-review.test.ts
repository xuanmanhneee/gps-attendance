import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isAttendanceReviewCandidate,
  parseAttendanceReviewCandidates,
} from './attendance-review.ts';

const buildCandidate = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 12,
  userId: 42,
  student: {
    code: '2312345',
    fullname: 'Nguyễn Văn A',
    role: 'participant',
  },
  reasons: ['LOW_CONFIDENCE_SCORE'],
  ...overrides,
});

describe('isAttendanceReviewCandidate', () => {
  it('chấp nhận candidate đúng contract với nhiều tín hiệu', () => {
    assert.equal(
      isAttendanceReviewCandidate(
        buildCandidate({
          reasons: ['OUT_OF_RANGE', 'INVALID_LOCATION_TIMESTAMP'],
        }),
      ),
      true,
    );
  });

  it('từ chối id, role, reason hoặc danh sách reason không hợp lệ', () => {
    assert.equal(
      isAttendanceReviewCandidate(buildCandidate({ userId: 0 })),
      false,
    );
    assert.equal(
      isAttendanceReviewCandidate(
        buildCandidate({
          student: { code: '1', fullname: 'A', role: 'student' },
        }),
      ),
      false,
    );
    assert.equal(
      isAttendanceReviewCandidate(buildCandidate({ reasons: ['UNKNOWN'] })),
      false,
    );
    assert.equal(
      isAttendanceReviewCandidate(buildCandidate({ reasons: [] })),
      false,
    );
  });
});

describe('parseAttendanceReviewCandidates', () => {
  it('bỏ item sai shape nhưng giữ các candidate hợp lệ', () => {
    const candidates = parseAttendanceReviewCandidates([
      buildCandidate(),
      null,
      buildCandidate({ userId: -1 }),
    ]);

    assert.deepEqual(
      candidates?.map((candidate) => candidate.userId),
      [42],
    );
  });

  it('trả null khi payload không phải mảng', () => {
    assert.equal(parseAttendanceReviewCandidates(null), null);
    assert.equal(parseAttendanceReviewCandidates({}), null);
  });
});
