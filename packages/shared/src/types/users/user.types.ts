import { Role } from '../auth';

export interface UserResponse {
  code: string;
  role: Role;
  fullname: string;
}

export interface UserProfileResponse {
  code: string;
  role: Role;
  fullname: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  programName?: string | null;
  cohort?: string | null;
  studyMode?: string | null;
}

export interface UpdateMyProfileRequest {
  fullname: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  programName: string | null;
  cohort: string | null;
  studyMode: string | null;
}

export type UserProfileDto = UserProfileResponse;


export interface CreateUserRequest {
  code: string;
  role: Role;
  fullname: string;
  unitId: number;
}
