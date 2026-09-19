import type { User } from '../../users/user.model';

export const mockUsers: User[] = [
  {
    id: 1,
    code: 'ADM0001',
    role: 'admin',
    unitId: 1,
    fullname: 'Quản trị viên',
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z'),
  },
  {
    id: 2,
    code: 'LEC0001',
    role: 'lecturer',
    unitId: 1,
    fullname: 'Giảng viên',
    createdAt: new Date('2026-01-02T08:00:00Z'),
    updatedAt: new Date('2026-01-02T08:00:00Z'),
  },
  {
    id: 3,
    code: 'STU0001',
    role: 'student',
    unitId: 3,
    fullname: 'Nguyen Van A',
    createdAt: new Date('2026-01-03T08:00:00Z'),
    updatedAt: new Date('2026-01-03T08:00:00Z'),
  },
  {
    id: 4,
    code: 'STU0002',
    role: 'student',
    unitId: 3,
    fullname: 'Tran Van B',
    createdAt: new Date('2026-01-04T08:00:00Z'),
    updatedAt: new Date('2026-01-04T08:00:00Z'),
  },
  {
    id: 5,
    code: 'STU003',
    role: 'student',
    unitId: 3,
    fullname: 'Le Thi C',
    createdAt: new Date('2026-01-05T08:00:00Z'),
    updatedAt: new Date('2026-01-05T08:00:00Z'),
  },
];
