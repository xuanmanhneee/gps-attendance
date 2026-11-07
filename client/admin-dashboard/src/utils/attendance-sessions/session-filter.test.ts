import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { vi } from '../../i18n/translations/vi.ts';
import { en } from '../../i18n/translations/en.ts';
import {
  createLoadTracker,
  isOrganizerUser,
  isValidOrganizerUserId,
  resolveSessionListScope,
  toOrganizerOptions,
} from './session-filter.ts';

describe('resolveSessionListScope', () => {
  it('Tất cả organizer (null) → dùng API danh sách toàn bộ', () => {
    assert.deepEqual(resolveSessionListScope(null), { scope: 'all' });
  });

  it('Chọn một organizer hợp lệ → dùng created-by với userId đó', () => {
    assert.deepEqual(resolveSessionListScope(12), {
      scope: 'created-by',
      createdByUserId: 12,
    });
  });

  it('userId không hợp lệ → trả null để UI KHÔNG gọi API nào cả', () => {
    for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(resolveSessionListScope(invalid), null, `case ${invalid}`);
    }
  });

  it('id hợp lệ theo guard API client: số nguyên dương', () => {
    assert.equal(isValidOrganizerUserId(1), true);
    assert.equal(isValidOrganizerUserId('12'), false);
    assert.equal(isValidOrganizerUserId(null), false);
  });
});

describe('toOrganizerOptions', () => {
  const USERS = [
    { id: 3, code: 'GV003', role: 'organizer', fullname: 'Lê Văn C' },
    { id: 1, code: 'AD001', role: 'admin', fullname: 'Nguyễn A' },
    { id: 2, code: 'SV002', role: 'participant', fullname: 'Trần B' },
    { id: 5, code: 'GV005', role: 'organizer', fullname: 'Phạm E' },
  ];

  it('chỉ giữ user có role organizer', () => {
    assert.deepEqual(
      toOrganizerOptions(USERS).map((option) => option.userId),
      [3, 5],
    );
  });

  it('label gồm fullname và code', () => {
    assert.deepEqual(toOrganizerOptions(USERS)[0], {
      userId: 3,
      label: 'Lê Văn C (GV003)',
    });
  });

  it('dedupe theo id và không mutate mảng input', () => {
    const input = [...USERS, { id: 3, code: 'GV003', role: 'organizer', fullname: 'Lê Văn C' }];
    const before = JSON.stringify(input);

    const options = toOrganizerOptions(input);

    assert.equal(options.length, 2);
    assert.equal(JSON.stringify(input), before);
  });

  it('bản ghi lỗi shape hoặc thiếu role bị bỏ qua, không throw', () => {
    assert.deepEqual(
      toOrganizerOptions([
        null,
        { id: 9 },
        { id: -2, code: 'X', role: 'organizer', fullname: 'Y' },
        { id: 7, code: 'GV007', role: 'organizer', fullname: '  ' },
      ]),
      [{ userId: 7, label: 'GV007' }],
    );
  });

  it('input không phải mảng → rỗng', () => {
    assert.deepEqual(toOrganizerOptions(undefined), []);
    assert.deepEqual(toOrganizerOptions({}), []);
  });

  it('isOrganizerUser yêu cầu role organizer và id nguyên dương', () => {
    assert.equal(isOrganizerUser(USERS[0]), true);
    assert.equal(isOrganizerUser(USERS[1]), false);
    assert.equal(isOrganizerUser({ id: 1, code: 'C', role: 'organizer' }), false);
  });
});

describe('createLoadTracker (chặn stale response khi đổi organizer)', () => {
  it('response của request cũ hoàn thành sau request mới bị bỏ qua', () => {
    const tracker = createLoadTracker();

    const first = tracker.begin();
    assert.equal(tracker.isActive(first), true);

    // Admin đổi organizer → request mới bắt đầu.
    const second = tracker.begin();
    assert.equal(tracker.isActive(first), false);
    assert.equal(tracker.isActive(second), true);
  });

  it('lỗi của request cũ sau khi đổi không được ghi state', () => {
    const tracker = createLoadTracker();

    const stale = tracker.begin();
    tracker.begin();

    // Mô phỏng: catch của request cũ chạy muộn → phải bỏ qua setError.
    assert.equal(tracker.isActive(stale), false);
  });

  it('request cũ kết thúc muộn không được tắt loading của request mới', () => {
    const tracker = createLoadTracker();

    const stale = tracker.begin();
    const fresh = tracker.begin();

    assert.equal(tracker.isActive(stale), false);
    assert.equal(tracker.isActive(fresh), true);
  });
});

describe('i18n bộ lọc organizer có đủ key ở vi và en', () => {
  const KEYS = [
    'sessions.filter.label',
    'sessions.filter.allOrganizers',
    'sessions.filter.loading',
    'sessions.filter.loadError',
    'sessions.filter.invalidOrganizer',
  ] as const;

  for (const key of KEYS) {
    it(`key ${key} tồn tại trong vi và en`, () => {
      assert.ok(key in vi);
      assert.ok(key in en);
    });
  }
});
