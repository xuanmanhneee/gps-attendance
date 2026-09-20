import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { withPendingUser, canStartAssignmentMutation } from './tag-pending.ts';

describe('withPendingUser', () => {
  it('theo dõi pending đồng thời của nhiều user', () => {
    let pending: ReadonlySet<number> = new Set<number>();

    // Hai request assignment chạy song song cho hai row khác nhau.
    pending = withPendingUser(pending, 11, true);
    pending = withPendingUser(pending, 22, true);

    assert.equal(pending.has(11), true);
    assert.equal(pending.has(22), true);
    assert.equal(pending.size, 2);
  });

  it('một request kết thúc chỉ xoá pending của chính user đó', () => {
    let pending: ReadonlySet<number> = withPendingUser(
      new Set<number>(),
      11,
      true,
    );
    pending = withPendingUser(pending, 22, true);

    // Request của user 11 kết thúc trước.
    const afterFirst = withPendingUser(pending, 11, false);

    assert.equal(afterFirst.has(11), false);
    assert.equal(afterFirst.has(22), true);
    assert.equal(pending.has(11), true, 'không mutate set cũ');
  });

  it('xoá pending hai lần là idempotent', () => {
    const pending = withPendingUser(new Set<number>([3]), 3, true);
    const once = withPendingUser(pending, 3, false);
    const twice = withPendingUser(once, 3, false);

    assert.equal(twice.size, 0);
    assert.notEqual(once, twice);
  });
});

describe('canStartAssignmentMutation (single-flight)', () => {
  it('cho phép request đầu tiên khi không có mutation nào đang chạy', () => {
    assert.equal(canStartAssignmentMutation(new Set<number>()), true);
  });

  it('chặn request thứ hai khi đang có mutation chạy (chống double-submit)', () => {
    const pending = withPendingUser(new Set<number>(), 11, true);

    assert.equal(canStartAssignmentMutation(pending), false);
  });

  it('mở lại sau khi mutation kết thúc', () => {
    const pending = withPendingUser(new Set<number>(), 11, true);
    const released = withPendingUser(pending, 11, false);

    assert.equal(canStartAssignmentMutation(released), true);
  });
});

