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
}

export type UserProfileDto = UserProfileResponse;


export interface CreateUserRequest {
  code: string;
  role: 'admin' | 'lecturer' | 'student';
  fullname: string;
  unitId: number;
}
