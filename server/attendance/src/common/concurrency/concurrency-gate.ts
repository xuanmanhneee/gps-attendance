import { HttpException, HttpStatus } from '@nestjs/common';
import { CommonErrorCode } from '@gps-attendance/shared';

/**
 * Giới hạn số tác vụ chạy đồng thời; phần dư xếp hàng trong bộ nhớ JS và bị
 * từ chối nhanh (503) khi hàng quá dài.
 *
 * Dùng cho việc nặng CPU chạy trên thread pool libuv (bcrypt). Thread pool
 * này còn phục vụ phân giải DNS và fs: nếu hàng trăm lần băm cùng xếp vào đó,
 * việc mở kết nối PostgreSQL mới phải chờ sau chúng và pool báo
 * "Connection terminated due to connection timeout" (đo được ~5–9% đăng nhập
 * lỗi 500 khi 300 người đăng nhập cùng lúc). Giữ `maxConcurrent` nhỏ hơn kích
 * thước thread pool để luôn còn thread trống cho DNS/fs.
 */
export class ConcurrencyGate {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxQueue: number,
  ) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
      throw new Error('maxConcurrent phải là số nguyên dương');
    }
  }

  get queueLength(): number {
    return this.waiting.length;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    if (this.waiting.length >= this.maxQueue) {
      return Promise.reject(
        new HttpException(
          {
            code: CommonErrorCode.SERVICE_UNAVAILABLE,
            message: 'Hệ thống đang quá tải, vui lòng thử lại sau ít giây',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    }
    // Slot được chuyển thẳng cho người chờ (không giảm `active`) để một lời gọi
    // mới không chen vào giữa lúc người chờ đang được đánh thức.
    return new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.active--;
    }
  }
}
