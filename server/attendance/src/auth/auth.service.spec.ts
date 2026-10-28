import { UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService.refresh', () => {
  const accounts = { findById: jest.fn(), findByUserId: jest.fn() };
  const users = { findById: jest.fn() };
  const jwt = { sign: jest.fn(() => 'new-access') };
  const refreshSessions = { rotate: jest.fn(), create: jest.fn() };
  const unitOfWork = {
    runInTransaction: jest.fn((work: (ctx: object) => Promise<unknown>) =>
      work({}),
    ),
  };
  const service = new AuthService(
    accounts as never,
    users as never,
    jwt as never,
    refreshSessions as never,
    unitOfWork as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    unitOfWork.runInTransaction.mockImplementation(
      (work: (ctx: object) => Promise<unknown>) => work({}),
    );
    jwt.sign.mockReturnValue('new-access');
    refreshSessions.rotate.mockResolvedValue(2);
    accounts.findById.mockResolvedValue({
      id: 2,
      userId: 7,
      username: 'organizer',
      status: 'active',
    });
    accounts.findByUserId.mockResolvedValue({
      id: 2,
      userId: 7,
      username: 'organizer',
      status: 'active',
    });
    users.findById.mockResolvedValue({ id: 7, role: 'organizer' });
  });

  it('đăng nhập luôn trả một LoginResponse có đủ hai token', async () => {
    const result = await service.login({
      userId: 7,
      username: 'organizer',
      role: 'organizer',
    });

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(refreshSessions.create).toHaveBeenCalledTimes(1);
  });

  it('cho làm mới phiên dashboard khi role là organizer', async () => {
    const result = await service.refresh('current-refresh', [
      'admin',
      'organizer',
    ]);

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(refreshSessions.rotate).toHaveBeenCalledTimes(1);
  });

  it('endpoint user không chấp nhận refresh token của organizer', async () => {
    await expect(service.refresh('current-refresh')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
