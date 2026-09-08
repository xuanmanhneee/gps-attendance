import { Role } from '../auth';

export interface UserResponse {
  code: string;
  role: Role;
  fullname: string;
}

export interface UserProfileDto {
  code: string;
  role: Role;
  fullname: string;
}
