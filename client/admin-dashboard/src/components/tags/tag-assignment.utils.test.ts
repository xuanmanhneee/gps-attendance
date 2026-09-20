import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAssignedRows,
  buildAvailableUsers,
} from './tag-assignment.utils.ts';

describe('buildAssignedRows', () => {
  it('fallback về ID khi directory thiếu user', () => {
    const rows = buildAssignedRows([7], new Map(), (id) => `ID ${id}`);

    assert.deepEqual(rows, [{ userId: 7, title: 'ID 7', subtitle: null }]);
  });

  it('ưu tiên fullname và kèm code khi directory có user', () => {
    const rows = buildAssignedRows(
      [1],
      new Map([[1, { id: 1, code: 'SV01', fullname: 'An' }]]),
      (id) => `ID ${id}`,
    );

    assert.deepEqual(rows, [{ userId: 1, title: 'An', subtitle: 'SV01' }]);
  });
});

describe('buildAvailableUsers', () => {
  it('loại user đã gán mà không mutate directory', () => {
    const directory = [
      { id: 1, code: 'SV01', fullname: 'An' },
      { id: 2, code: 'SV02', fullname: 'Binh' },
    ];
    const available = buildAvailableUsers(directory, [1]);

    assert.deepEqual(available, [{ id: 2, code: 'SV02', fullname: 'Binh' }]);
    assert.equal(directory.length, 2);
  });
});
