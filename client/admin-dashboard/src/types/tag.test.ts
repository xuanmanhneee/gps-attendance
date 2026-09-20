import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isDirectoryUserList,
  isTag,
  isTagList,
  isUserIdList,
  parseUserIdInput,
  validateTagName,
} from './tag.ts';

describe('validateTagName', () => {
  it('trim khoảng trắng trước khi gửi', () => {
    assert.deepEqual(validateTagName('  K16  '), { ok: true, value: 'K16' });
  });

  it('chặn tên rỗng', () => {
    assert.deepEqual(validateTagName('   '), {
      ok: false,
      error: 'tags.nameRequired',
    });
  });

  it('chặn tên dài hơn 100 ký tự', () => {
    assert.deepEqual(validateTagName('a'.repeat(101)), {
      ok: false,
      error: 'tags.nameTooLong',
    });
  });

  it('chấp nhận đúng 100 ký tự', () => {
    const value = 'a'.repeat(100);
    assert.deepEqual(validateTagName(value), { ok: true, value });
  });
});

describe('response guards', () => {
  it('chấp nhận tag list hợp lệ', () => {
    assert.equal(
      isTagList([
        { id: 1, name: 'K16', ownerId: 2, createdAt: '2026-01-01T00:00:00Z' },
      ]),
      true,
    );
  });

  it('loại bỏ payload sai thay vì fallback im lặng', () => {
    assert.equal(isTagList([{ id: 1, name: 'K16' }]), false);
    assert.equal(isTagList({}), false);
    assert.equal(isTag(null), false);
    assert.equal(isTag({ id: 1, name: 'x', ownerId: 1, createdAt: 5 }), false);
  });

  it('chấp nhận payload assignment là number[]', () => {
    assert.equal(isUserIdList([1, 2, 3]), true);
    assert.equal(isUserIdList([0]), false);
    assert.equal(isUserIdList(['1']), false);
  });

  it('chấp nhận directory payload có đủ field cần thiết', () => {
    assert.equal(
      isDirectoryUserList([{ id: 1, code: 'SV01', fullname: 'An' }]),
      true,
    );
    assert.equal(isDirectoryUserList([{ id: 1, code: 'SV01' }]), false);
  });
});

describe('parseUserIdInput', () => {
  it('parse số nguyên dương', () => {
    assert.equal(parseUserIdInput(' 12 '), 12);
  });

  it('loại bỏ input không phải số nguyên dương', () => {
    assert.equal(parseUserIdInput(''), null);
    assert.equal(parseUserIdInput('1.5'), null);
    assert.equal(parseUserIdInput('-3'), null);
    assert.equal(parseUserIdInput('abc'), null);
  });
});
