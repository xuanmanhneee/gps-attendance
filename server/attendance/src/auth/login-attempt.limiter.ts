import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommonErrorCode } from '@gps-attendance/shared';

import { RateLimiterService } from '../common/rate-limit/rate-limiter.service';

const intFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/**
 * Chặn đoán mật khẩu theo từng username: mỗi lần thử được tính TRƯỚC khi xác
 * thực (tăng nguyên tử trong Redis), vượt ngưỡng thì khoá tạm. Đăng nhập đúng
 * xoá bộ đếm, nên người dùng thật gõ đúng không bị phạt.
 *
 * Phải tăng trước rồi mới kiểm tra: kiểu "đọc bộ đếm → xác thực → ghi lỗi"
 * cho phép gửi song song N lần đoán, tất cả cùng đọc được bộ đếm còn thấp.
 *
 * Đếm theo username chứ không theo IP vì cả lớp có thể dùng chung một IP
 * (NAT của trường). Đánh đổi: kẻ xấu có thể cố ý khoá tài khoản của người
 * khác tối đa `windowSec` giây; chấp nhận được hơn là để dò mật khẩu tự do.
 */
@Injectable()
export class LoginAttemptLimiter {
  private readonly maxAttempts = intFromEnv('LOGIN_MAX_FAILURES', 10);
  private readonly windowSec = intFromEnv('LOGIN_FAILURE_WINDOW_SEC', 300);

  constructor(private readonly limiter: RateLimiterService) {}

  private key(username: string): string {
    return `auth:login-attempts:${username.trim().toLowerCase()}`;
  }

  /** Ghi nhận một lần thử; ném 429 nếu username đã vượt ngưỡng. */
  async beginAttempt(username: string): Promise<void> {
    const attempts = await this.limiter.hit(this.key(username), this.windowSec);
    if (attempts !== null && attempts > this.maxAttempts) {
      const retryAfter = await this.limiter.ttlSec(this.key(username));
      throw new HttpException(
        {
          code: CommonErrorCode.TOO_MANY_REQUESTS,
          message: `Đăng nhập sai quá nhiều lần, thử lại sau ${retryAfter} giây`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordSuccess(username: string): Promise<void> {
    await this.limiter.reset(this.key(username));
  }
}
