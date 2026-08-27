// users/mocks/users.mock.ts

import type { User } from '../user.model';

export const MOCK_USERS: User[] = [
  {
    id: 1,
    accountId: 1,
    code: 'ADMIN001',
    role: 'admin',
    name: 'Quản trị viên',
  },
  {
    id: 2,
    accountId: 2,
    code: 'GV001',
    role: 'lecturer',
    name: 'Trần Nhật Quang',
  },
  {
    id: 3,
    accountId: 3,
    code: '2312686',
    role: 'student',
    name: 'Phan Lê Xuân Mạnh',
  },
  {
    id: 4,
    accountId: 4,
    code: '2312716',
    role: 'student',
    name: 'Mai Quý Phước',
  },
  {
    id: 5,
    accountId: 5,
    code: '2312718',
    role: 'student',
    name: 'Phạm Nguyễn Ngọc Phước',
  },
  {
    id: 6,
    accountId: 6,
    code: '2312682',
    role: 'student',
    name: 'Liêng Hót Ha Luyến',
  },
  {
    id: 7,
    accountId: 7,
    code: '2312631',
    role: 'student',
    name: 'Nguyễn Trần Quỳnh Hương',
  },
];
