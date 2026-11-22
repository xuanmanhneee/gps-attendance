import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterUsers,
  paginate,
  parseUserList,
  summarizeUsersByRole,
  type UserListItem,
} from './user-list.ts';

const mk = (id: number, role: UserListItem['role'], code: string, fullname: string): UserListItem => ({
  id,
  code,
  role,
  unitId: 1,
  fullname,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});
const users = [
  mk(1, 'admin', 'AD01', 'Quản Trị'),
  mk(2, 'organizer', 'GV001', 'Nguyễn Văn A'),
  mk(3, 'participant', 'SV001', 'Trần Thị B'),
  mk(4, 'participant', 'SV002', 'Lê C'),
];

test('filterUsers theo mã/tên (không phân biệt hoa thường) và role', () => {
  assert.equal(filterUsers(users, 'sv0', 'all').length, 2);
  assert.equal(filterUsers(users, 'nguyễn', 'all').length, 1);
  assert.equal(filterUsers(users, '', 'participant').length, 2);
  assert.equal(filterUsers(users, 'gv', 'participant').length, 0);
  assert.equal(users.length, 4);
});

test('summarizeUsersByRole', () => {
  assert.deepEqual(summarizeUsersByRole(users), {
    total: 4,
    admin: 1,
    organizer: 1,
    participant: 2,
  });
});

test('parseUserList: không phải mảng -> null; item sai shape bị bỏ và đếm', () => {
  assert.equal(parseUserList({ users: [] }), null);
  assert.equal(parseUserList(null), null);
  const r = parseUserList([users[0], { id: 'x' }, { ...users[1], role: 'root' }]);
  assert.equal(r?.users.length, 1);
  assert.equal(r?.dropped, 2);
  assert.deepEqual(parseUserList([]), { users: [], dropped: 0 });
});

test('paginate 50/trang, kẹp trang ngoài khoảng', () => {
  const items = Array.from({ length: 120 }, (_, i) => i);
  const p1 = paginate(items, 1);
  assert.equal(p1.items.length, 50);
  assert.equal(p1.pageCount, 3);
  assert.deepEqual([p1.from, p1.to], [1, 50]);
  const p3 = paginate(items, 3);
  assert.equal(p3.items.length, 20);
  assert.deepEqual([p3.from, p3.to], [101, 120]);
  assert.equal(paginate(items, 99).page, 3);
  assert.equal(paginate(items, 0).page, 1);
  assert.equal(paginate(items, Number.NaN).page, 1);
  const empty = paginate([], 1);
  assert.deepEqual([empty.pageCount, empty.from, empty.to, empty.total], [1, 0, 0, 0]);
});
