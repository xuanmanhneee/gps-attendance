import type { Role } from '@gps-attendance/shared';

export interface AuthenticatedUser {
  userId: number;
  username: string;
  role: Role;
}
