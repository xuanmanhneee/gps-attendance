import type { CreateUserRequest, Role } from '@gps-attendance/shared';

export interface User {
  id: number;
  code: string;
  role: Role;
  unitId: number | null;
  fullname: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  programName?: string | null;
  cohort?: string | null;
  studyMode?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserProfileUpdate = Partial<Pick<
  User,
  | 'fullname'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'gender'
  | 'address'
  | 'programName'
  | 'cohort'
  | 'studyMode'
>>;
