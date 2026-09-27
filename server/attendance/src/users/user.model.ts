import type { CreateUserRequest, Role } from '@gps-attendance/shared';

export interface User {
  id: number;
  code: string;
  role: Role;
  unitId: number | null;
  fullname: string;

  createdAt: Date;
  updatedAt: Date;
}
