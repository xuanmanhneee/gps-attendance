import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createRequestScope } from './request-scope.ts';

type Commit = { tagId: number; userIds: number[] };

describe('createRequestScope', () => {
  it('chỉ commit response mới nhất của cùng một tag', () => {
    const scope = createRequestScope();
    const commits: Commit[] = [];
    const commit = (
      token: ReturnType<typeof scope.begin>,
      userIds: number[],
    ) => {
      if (scope.isCurrent(token)) commits.push({ tagId: token.key!, userIds });
    };

    const first = scope.begin(1);
    const second = scope.begin(1);

    commit(first, [10]);
    commit(second, [20]);

    assert.deepEqual(commits, [{ tagId: 1, userIds: [20] }]);
  });

  it('response trả về muộn của tag cũ không ghi đè state của tag mới', () => {
    const scope = createRequestScope();
    const commits: Commit[] = [];
    const commit = (
      token: ReturnType<typeof scope.begin>,
      userIds: number[],
    ) => {
      if (scope.isCurrent(token)) commits.push({ tagId: token.key!, userIds });
    };

    // Người dùng mở tag A rồi đổi sang tag B trước khi A hoàn thành.
    const tagAToken = scope.begin(1);
    const tagBToken = scope.begin(2);

    commit(tagBToken, [200]);
    commit(tagAToken, [100]); // A hoàn thành sau B

    assert.deepEqual(commits, [{ tagId: 2, userIds: [200] }]);
  });

  it('bỏ qua mọi request đang chạy sau khi đóng panel', () => {
    const scope = createRequestScope();
    const token = scope.begin(5);

    scope.invalidate();

    assert.equal(scope.isCurrent(token), false);
    assert.equal(scope.currentKey(), null);
  });

  it('currentKey dùng để quản lý pending theo tag hiện tại', () => {
    const scope = createRequestScope();

    assert.equal(scope.currentKey(), null);

    scope.begin(7);
    assert.equal(scope.currentKey(), 7);

    scope.begin(8);
    assert.equal(scope.currentKey(), 8);
  });
});
