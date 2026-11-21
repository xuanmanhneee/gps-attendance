import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

import { AuthService } from '../../src/auth/auth.service';

// bcrypt là native module nên không spyOn được; bọc lại để đếm lời gọi compare.
jest.mock('bcrypt', () => {
  const actual = jest.requireActual<typeof import('bcrypt')>('bcrypt');
  return { ...actual, compare: jest.fn(actual.compare) };
});

describe('AuthService bảo mật', () => {
  const accounts = { findByUsername: jest.fn() };
  const users = { findById: jest.fn() };
  const refreshSessions = { revoke: jest.fn() };
  const service = new AuthService(
    accounts as never,
    users as never,
    {} as never,
    refreshSessions as never,
    {} as never,
  );

  beforeEach(() => {
    accounts.findByUsername.mockReset();
    users.findById.mockReset();
    refreshSessions.revoke.mockReset();
  });

  it('username không tồn tại vẫn tốn một lần bcrypt.compare (chống dò username qua thời gian)', async () => {
    accounts.findByUsername.mockResolvedValue(null);
    const compare = bcrypt.compare as unknown as jest.Mock;
    compare.mockClear();
    await expect(service.validateUser('khong-co', 'x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('sai mật khẩu và username không tồn tại trả cùng một thông báo', async () => {
    accounts.findByUsername.mockResolvedValueOnce(null).mockResolvedValueOnce({
      passwordHash: bcrypt.hashSync('dung', 4),
      status: 'active',
      userId: 1,
    });
    const a = (await service
      .validateUser('khong-co', 'sai')
      .catch((e: unknown) => e)) as Error;
    const b = (await service
      .validateUser('co', 'sai')
      .catch((e: unknown) => e)) as Error;
    expect(a.message).toBe(b.message);
  });

  it('logout thu hồi theo hash SHA-256 của refresh token, không lưu token thô', async () => {
    await service.logout('token-raw');
    expect(refreshSessions.revoke).toHaveBeenCalledWith(
      createHash('sha256').update('token-raw').digest('hex'),
    );
  });
});
