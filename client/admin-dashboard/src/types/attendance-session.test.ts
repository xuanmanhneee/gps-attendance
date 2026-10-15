import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAttendanceParticipant,
  isAttendanceSession,
  isAttendanceSessionDetail,
  parseAttendanceSessionList,
  parseSessionId,
} from './attendance-session.ts';

const buildSession = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Buổi học sáng',
  latitude: 21.0278,
  longitude: 105.8342,
  radius: 50,
  openAt: '2026-09-20T08:00',
  closeAt: '2026-09-20T10:00',
  status: 'open',
  ...overrides,
});

const buildParticipant = (overrides: Record<string, unknown> = {}) => ({
  user: { code: 'SV001', fullname: 'Nguyễn Văn A', role: 'student' },
  status: 'present',
  checkedInAt: '2026-09-20T08:05',
  updatedAt: '2026-09-20T08:05',
  ...overrides,
});

describe('parseSessionId', () => {
  it('nhận số nguyên dương từ route param', () => {
    assert.equal(parseSessionId('42'), 42);
  });

  it('trả null cho id thiếu, không phải số hoặc không dương', () => {
    assert.equal(parseSessionId(undefined), null);
    assert.equal(parseSessionId(''), null);
    assert.equal(parseSessionId('me'), null);
    assert.equal(parseSessionId('0'), null);
    assert.equal(parseSessionId('-3'), null);
    assert.equal(parseSessionId('3.5'), null);
  });
});

describe('isAttendanceSession', () => {
  it('chấp nhận response đúng shape, kể cả trạng thái cancelled', () => {
    assert.equal(isAttendanceSession(buildSession()), true);
    assert.equal(
      isAttendanceSession({ ...buildSession(), status: 'cancelled' }),
      true,
    );
  });

  it('từ chối payload thiếu field hoặc sai status', () => {
    assert.equal(isAttendanceSession({ ...buildSession(), id: 'x' }), false);
    assert.equal(
      isAttendanceSession({ ...buildSession(), status: 'archived' }),
      false,
    );
  });
});

describe('parseAttendanceSessionList', () => {
  it('giữ đủ item khi mọi item đúng shape (kể cả cancelled)', () => {
    const sessions = parseAttendanceSessionList([
      buildSession(),
      { ...buildSession({ id: 2 }), status: 'cancelled' },
    ]);

    assert.deepEqual(
      sessions?.map((session) => session.id),
      [1, 2],
    );
  });

  it('bỏ item lệch shape thay vì loại cả danh sách', () => {
    const sessions = parseAttendanceSessionList([
      buildSession(),
      null,
      { ...buildSession(), id: 'x' },
    ]);

    assert.deepEqual(
      sessions?.map((session) => session.id),
      [1],
    );
  });

  it('trả null khi payload không phải mảng', () => {
    assert.equal(parseAttendanceSessionList('not-an-array'), null);
    assert.equal(parseAttendanceSessionList(null), null);
  });
});

describe('isAttendanceParticipant', () => {
  it('yêu cầu code, fullname, role và trạng thái điểm danh hợp lệ', () => {
    assert.equal(isAttendanceParticipant(buildParticipant()), true);
    assert.equal(
      isAttendanceParticipant(
        buildParticipant({ status: 'absent', checkedInAt: null }),
      ),
      true,
    );
    assert.equal(
      isAttendanceParticipant(
        buildParticipant({ status: 'late', checkedInAt: '2026-09-20T08:20' }),
      ),
      true,
    );
    assert.equal(
      isAttendanceParticipant(
        buildParticipant({ status: 'excused', checkedInAt: null }),
      ),
      true,
    );
  });

  it('từ chối khi thiếu user hợp lệ hoặc trạng thái lạ', () => {
    assert.equal(
      isAttendanceParticipant(
        buildParticipant({ user: { code: 'SV001' }, status: 'present' }),
      ),
      false,
    );
    assert.equal(
      isAttendanceParticipant(buildParticipant({ status: 'pending' })),
      false,
    );
    assert.equal(isAttendanceParticipant(null), false);
  });
});

describe('isAttendanceSessionDetail', () => {
  it('chấp nhận detail có danh sách participant hợp lệ (kể cả rỗng)', () => {
    assert.equal(
      isAttendanceSessionDetail({
        ...buildSession(),
        participants: [buildParticipant()],
      }),
      true,
    );
    assert.equal(
      isAttendanceSessionDetail({ ...buildSession(), participants: [] }),
      true,
    );
  });

  it('từ chối khi participants thiếu hoặc chứa item sai shape', () => {
    assert.equal(isAttendanceSessionDetail(buildSession()), false);
    assert.equal(
      isAttendanceSessionDetail({
        ...buildSession(),
        participants: [buildParticipant({ status: 'unknown' })],
      }),
      false,
    );
  });
});
