import type { Role } from '@gps-attendance/shared';

export interface User {
  id: number;
  accountId: number;
  code: string;
  role: Role;
  fullname: string;
}
