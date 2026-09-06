// auth/types/authenticated-request.ts
import { Request } from 'express';
import { AuthenticatedUser } from '../types/authenticated-user.type'; // cùng thư mục auth/types, path gọn hơn

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
