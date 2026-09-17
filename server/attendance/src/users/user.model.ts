import type { Role } from '@gps-attendance/shared';

export interface User {
  id: number;
  code: string;
  role: Role;
  fullname: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  code: string;
  role: 'admin' | 'lecturer' | 'student';
  fullname: string;
}
