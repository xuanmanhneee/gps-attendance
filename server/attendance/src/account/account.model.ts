import { Role } from '@gps-attendance/shared';

export type AccountStatus = 'active' | 'locked' | 'disabled';

export interface Account {
  id: number;
  userId: number;
  username: string;
  passwordHash: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  userId: number;
  username: string;
  passwordHash: string;
}

export interface CreateAccountWithUserInput {
  code: string;
  fullname: string;
  role: Role;
  unitId: number;
  username: string;
  password: string;
}
