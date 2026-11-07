import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGetCache } from './get-cache.ts';

describe('GET cache', () => {
  it('gộp request đang chạy và dùng lại kết quả còn hạn', async () => {
    const cache = createGetCache();
    let resolve!: (value: number) => void;
    let calls = 0;
    const load = () => {
      calls += 1;
      return new Promise<number>((done) => {
        resolve = done;
      });
    };

    const first = cache.get('/units', load, 60_000);
    const second = cache.get('/units', load, 60_000);
    assert.equal(first, second);
    assert.equal(calls, 1);
    resolve(3);
    assert.equal(await second, 3);
    assert.equal(await cache.get('/units', load, 60_000), 3);
    assert.equal(calls, 1);
  });

  it('tải mới khi ép refresh và không lưu response cũ sau khi clear', async () => {
    const cache = createGetCache();
    let resolveOld!: (value: number) => void;
    const old = cache.get(
      '/tags',
      () =>
        new Promise<number>((done) => {
          resolveOld = done;
        }),
      60_000,
    );

    cache.clear();
    assert.equal(await cache.get('/tags', async () => 2, 60_000), 2);
    resolveOld(1);
    assert.equal(await old, 1);
    assert.equal(await cache.get('/tags', async () => 3, 60_000), 2);
    assert.equal(await cache.get('/tags', async () => 3, 60_000, true), 3);
  });

  it('không dùng cache của tài khoản trước', async () => {
    const cache = createGetCache();
    cache.setScope('account-a');
    assert.equal(await cache.get('/v0/users/me', async () => 'A', 60_000), 'A');
    cache.setScope('account-b');
    assert.equal(await cache.get('/v0/users/me', async () => 'B', 60_000), 'B');
  });
});
