import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from './types/authenticated-user.type';

describe('AuthService', () => {
  let authService: AuthService;
  let accountService: jest.Mocked<Partial<AccountService>>;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let redisService: any;

  const mockUser: AuthenticatedUser = {
    userId: 1,
    username: 'testuser',
    role: 'student',
  };

  beforeEach(() => {
    accountService = {
      findByUsername: jest.fn(),
    };
    usersService = {
      findById: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'mock-jwt-secret';
        if (key === 'REFRESH_TOKEN_SECRET') return 'mock-refresh-secret';
        return 'mock-secret';
      }),
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ISSUER' || key === 'JWT_AUDIENCE') return undefined;
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '14d';
        return '14d';
      }),
    };
    redisService = {
      setBlacklistToken: jest.fn().mockResolvedValue(undefined),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    };

    authService = new AuthService(
      accountService as AccountService,
      usersService as UsersService,
      jwtService as JwtService,
      configService as ConfigService,
      redisService,
    );
  });

  describe('validateUser', () => {
    it('nên trả về AuthenticatedUser khi username và password hợp lệ', async () => {
      const rawPassword = 'password123';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      accountService.findByUsername = jest.fn().mockResolvedValue({
        id: 10,
        userId: 1,
        username: 'testuser',
        passwordHash: hashedPassword,
      });

      usersService.findById = jest.fn().mockResolvedValue({
        id: 1,
        code: '2312686',
        role: 'student',
        fullname: 'Nguyen Van A',
      });

      const result = await authService.validateUser('testuser', rawPassword);
      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
        role: 'student',
      });
    });

    it('nên ném UnauthorizedException khi tài khoản không tồn tại', async () => {
      accountService.findByUsername = jest.fn().mockResolvedValue(null);

      await expect(
        authService.validateUser('notfound', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên ném UnauthorizedException khi sai mật khẩu', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      accountService.findByUsername = jest.fn().mockResolvedValue({
        id: 10,
        username: 'testuser',
        passwordHash: hashedPassword,
      });

      await expect(
        authService.validateUser('testuser', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('nên sinh accessToken và refreshToken', () => {
      const tokens = authService.login(mockUser);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('nên gắn issuer, audience và jti vào payload để tăng an toàn JWT', () => {
      authService.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.userId,
          username: mockUser.username,
          role: mockUser.role,
          iss: 'gps-attendance',
          aud: 'gps-attendance-app',
          jti: expect.any(String),
        }),
        expect.anything(),
      );
    });
  });

  describe('refresh', () => {
    it('nên cấp token mới khi refreshToken hợp lệ', async () => {
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 1,
        username: 'testuser',
        role: 'student',
      });

      const tokens = await authService.refresh('valid-refresh-token');
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    });

    it('nên ném UnauthorizedException khi refreshToken không hợp lệ', async () => {
      jwtService.verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('nên ném UnauthorizedException khi refreshToken đã bị thu hồi (blacklisted)', async () => {
      redisService.isTokenBlacklisted.mockResolvedValueOnce(true);

      await expect(authService.refresh('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
