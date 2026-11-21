import { HttpException } from '@nestjs/common';

import { LoginAttemptLimiter } from '../../src/auth/login-attempt.limiter';

describe('LoginAttemptLimiter', () => {
  const limiter = {
    hit: jest.fn(),
    reset: jest.fn(),
    ttlSec: jest.fn(),
  };
  const service = new LoginAttemptLimiter(limiter as never);

  beforeEach(() => {
    jest.resetAllMocks();
    limiter.ttlSec.mockResolvedValue(120);
  });

  it('cho qua khi chưa vượt ngưỡng (lần thứ 10 vẫn được thử)', async () => {
    limiter.hit.mockResolvedValue(10);
    await expect(service.beginAttempt('sv01')).resolves.toBeUndefined();
  });

  it('trả 429 từ lần thứ 11, kèm thời gian chờ', async () => {
    limiter.hit.mockResolvedValue(11);
    const error = await service.beginAttempt('sv01').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect(JSON.stringify((error as HttpException).getResponse())).toContain(
      '120',
    );
  });

  it('fail-open khi Redis không phản hồi (hit = null)', async () => {
    limiter.hit.mockResolvedValue(null);
    await expect(service.beginAttempt('sv01')).resolves.toBeUndefined();
  });

  it('chuẩn hoá username để không né giới hạn bằng chữ hoa/khoảng trắng', async () => {
    limiter.hit.mockResolvedValue(1);
    await service.beginAttempt(' SV01 ');
    await service.beginAttempt('Sv01');
    expect(limiter.hit).toHaveBeenNthCalledWith(
      1,
      'auth:login-attempts:sv01',
      300,
    );
    expect(limiter.hit).toHaveBeenNthCalledWith(
      2,
      'auth:login-attempts:sv01',
      300,
    );
  });

  it('đăng nhập đúng thì xoá bộ đếm', async () => {
    await service.recordSuccess('sv01');
    expect(limiter.reset).toHaveBeenCalledWith('auth:login-attempts:sv01');
  });
});
