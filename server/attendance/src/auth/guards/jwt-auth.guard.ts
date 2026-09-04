import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthErrorCode } from '@gps-attendance/shared';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: 'Access token đã hết hạn',
      });
    }

    if (err || !user) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Access token không hợp lệ',
      });
    }
    return user;
  }
}
