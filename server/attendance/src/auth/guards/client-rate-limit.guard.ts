import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CommonErrorCode } from '@gps-attendance/shared';
import type { Request } from 'express';

import { RateLimiterService } from '../../common/rate-limit/rate-limiter.service';

const intFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/**
 * Giới hạn thô theo IP cho login/refresh, chạy TRƯỚC LocalAuthGuard để một
 * đợt flood không tốn CPU bcrypt (mỗi lần ~60 ms trên thread pool dùng chung).
 *
 * Mặc định 1000 lượt/phút/IP: đủ cho cả một giảng đường dùng chung NAT đăng
 * nhập cùng lúc, nhưng chặn được flood. Khi chạy sau proxy phải đặt
 * TRUST_PROXY để `req.ip` là IP client thật, nếu không mọi người cùng chung
 * một bộ đếm của proxy.
 */
@Injectable()
export class ClientRateLimitGuard implements CanActivate {
  private readonly limit = intFromEnv('AUTH_IP_LIMIT_PER_MIN', 1000);

  constructor(private readonly limiter: RateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const count = await this.limiter.hit(`auth:ip:${req.ip ?? 'unknown'}`, 60);

    if (count !== null && count > this.limit) {
      throw new HttpException(
        {
          code: CommonErrorCode.TOO_MANY_REQUESTS,
          message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
