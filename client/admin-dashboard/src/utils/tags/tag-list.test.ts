import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { Tag } from '../../types/tag';
import {
  applyTagCreated,
  applyTagDeleted,
  runTagMutation,
} from './tag-list.ts';

const buildTag = (id: number, name = `tag-${id}`): Tag => ({
  id,
  name,
  ownerId: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('applyTagCreated', () => {
  it('thêm tag mới lên đầu mà không mutate mảng cũ', () => {
    const current = [buildTag(1), buildTag(2)];
    const next = applyTagCreated(current, buildTag(3));

    assert.deepEqual(
      next.map((tag) => tag.id),
      [3, 1, 2],
    );
    assert.deepEqual(
      current.map((tag) => tag.id),
      [1, 2],
    );
  });

  it('upsert theo id để gọi lại sau refresh không tạo duplicate', () => {
    const current = [buildTag(1), buildTag(2)];
    const next = applyTagCreated(current, buildTag(2, 'renamed'));

    assert.equal(next.length, 2);
    assert.equal(next[0]?.name, 'renamed');
  });
});

describe('applyTagDeleted', () => {
  it('chỉ xoá đúng tag mục tiêu và giữ mảng cũ nguyên vẹn', () => {
    const current = [buildTag(1), buildTag(2)];
    const next = applyTagDeleted(current, 1);

    assert.deepEqual(
      next.map((tag) => tag.id),
      [2],
    );
    assert.equal(current.length, 2);
  });
});

describe('runTagMutation', () => {
  it('POST thành công nhưng refresh lỗi vẫn coi mutation là thành công', async () => {
    const refreshFailure = new Error('GET /tags failed with 500');
    let applied: Tag | null = null;

    const outcome = await runTagMutation(
      async () => buildTag(9),
      (created) => {
        applied = created;
      },
      async () => refreshFailure,
    );

    assert.equal(outcome.result.id, 9);
    assert.equal(outcome.refreshError, refreshFailure);
    assert.equal(applied?.id, 9);
  });

  it('DELETE thành công nhưng refresh lỗi vẫn không throw', async () => {
    let appliedId: number | null = null;

    const outcome = await runTagMutation(
      async () => {
        return undefined;
      },
      () => {
        appliedId = 4;
      },
      async () => new Error('refresh failed'),
    );

    assert.equal(outcome.result, undefined);
    assert.ok(outcome.refreshError instanceof Error);
    assert.equal(appliedId, 4);
  });

  it('refresh thành công trả refreshError = null', async () => {
    const outcome = await runTagMutation(
      async () => buildTag(3),
      () => undefined,
      async () => null,
    );

    assert.equal(outcome.refreshError, null);
  });

  it('lỗi mutation được throw và không gọi refresh', async () => {
    let refreshCalled = false;
    let applied = false;

    await assert.rejects(
      () =>
        runTagMutation(
          async () => {
            throw new Error('POST /tags failed');
          },
          () => {
            applied = true;
          },
          async () => {
            refreshCalled = true;
            return null;
          },
        ),
      /POST \/tags failed/,
    );

    assert.equal(refreshCalled, false);
    assert.equal(applied, false);
  });
});
