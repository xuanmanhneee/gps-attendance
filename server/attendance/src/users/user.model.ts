import type { CreateUserRequest, Role } from '@gps-attendance/shared';

export interface User {
  id: number;
  code: string;
  role: Role;
  fullname: string;
  createdAt: Date;
  updatedAt: Date;
}


