import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service';

// INCR + EXPIRE trong một script để không bao giờ để lại bộ đếm không có TTL
// (process chết giữa hai lệnh sẽ khoá một khoá vĩnh viễn).
const HIT_SCRIPT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
`;

/**
 * Bộ đếm cửa sổ cố định dùng Redis, chia sẻ giữa các instance.
 *
 * Fail-open: nếu Redis lỗi thì cho request đi tiếp (trả `null`), vì giới hạn
 * tốc độ là lớp phòng vệ phụ — không được làm sập đăng nhập khi Redis chập
 * chờn. Redis lỗi đã được /health và log cảnh báo của RedisModule báo riêng.
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private readonly redis: RedisService) {}

  /** Tăng bộ đếm và trả giá trị mới; `null` nếu Redis không phản hồi. */
  async hit(key: string, windowSec: number): Promise<number | null> {
    try {
      return Number(
        await this.redis.eval(HIT_SCRIPT, [key], [String(windowSec)]),
      );
    } catch (error) {
      this.warn(error);
      return null;
    }
  }

  /** Đọc bộ đếm mà không tăng; `0` nếu chưa có, `null` nếu Redis lỗi. */
  async peek(key: string): Promise<number | null> {
    try {
      return Number((await this.redis.get(key)) ?? 0);
    } catch (error) {
      this.warn(error);
      return null;
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.warn(error);
    }
  }

  async ttlSec(key: string): Promise<number> {
    try {
      return Math.max(await this.redis.ttl(key), 0);
    } catch {
      return 0;
    }
  }

  private warn(error: unknown) {
    this.logger.warn(
      `Rate limiter bỏ qua vì Redis lỗi: ${(error as Error).message}`,
    );
  }
}
