import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { tokenService } from './token.service.ts';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
};

describe('tokenService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createStorage(),
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: createStorage(),
    });
  });

  it('không ghi nhớ: chỉ giữ access token trong tab hiện tại', () => {
    tokenService.set('access');

    assert.equal(tokenService.get(), 'access');
    assert.equal(sessionStorage.getItem('token'), 'access');
    assert.equal(localStorage.getItem('token'), null);
    assert.equal(tokenService.getRefresh(), null);
  });

  it('ghi nhớ: lưu cặp token và xoá khi đăng xuất', () => {
    tokenService.set('access', 'refresh');

    assert.equal(localStorage.getItem('token'), 'access');
    assert.equal(tokenService.getRefresh(), 'refresh');
    assert.equal(sessionStorage.getItem('token'), null);

    tokenService.remove();
    assert.equal(tokenService.get(), null);
    assert.equal(tokenService.getRefresh(), null);
  });

  it('bỏ ghi nhớ ở lần đăng nhập sau thì xoá refresh token cũ', () => {
    tokenService.set('old-access', 'old-refresh');
    tokenService.set('new-access');

    assert.equal(tokenService.get(), 'new-access');
    assert.equal(tokenService.getRefresh(), null);
    assert.equal(localStorage.getItem('token'), null);
  });
});
