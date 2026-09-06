import { Role } from "../auth";

export interface UserProfile {
  code: string;
  role: Role
  fullname: string;
}
