import * as bcrypt from 'bcryptjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthErrorCode, LoginResponse } from '@gps-attendance/shared';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Xác thực username/password và resolve thành
   * identity của user đã được xác thực.
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const account = await this.accountService.findByUsername(username);

    if (!account) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, account.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    const user = await this.usersService.findById(account.userId);

    if (!user) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    return {
      userId: user.id,
      username: account.username,
      role: user.role,
    };
  }

  /**
   * Cấp access token cho user đã được xác thực.
   */
  login(user: AuthenticatedUser): LoginResponse {
    const issuer = this.configService.get<string>('JWT_ISSUER') ?? 'gps-attendance';
    const audience = this.configService.get<string>('JWT_AUDIENCE') ?? 'gps-attendance-app';
    const accessTokenPayload: JwtPayload = {
      sub: user.userId,
      username: user.username,
      role: user.role,
      iss: issuer,
      aud: audience,
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };

    const refreshTokenPayload: JwtPayload = {
      ...accessTokenPayload,
      jti: randomUUID(),
    };

    const accessTokenOptions = {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m') as SignOptions['expiresIn'],
      issuer,
      audience,
    } as SignOptions & { secret: string };

    const refreshTokenOptions = {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '14d') as SignOptions['expiresIn'],
      issuer,
      audience,
    } as SignOptions & { secret: string };

    return {
      accessToken: this.jwtService.sign(accessTokenPayload, accessTokenOptions),
      refreshToken: this.jwtService.sign(refreshTokenPayload, refreshTokenOptions),
    };
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    try {
      const issuer = this.configService.get<string>('JWT_ISSUER') ?? 'gps-attendance';
      const audience = this.configService.get<string>('JWT_AUDIENCE') ?? 'gps-attendance-app';
      const isBlacklisted = await this.redisService.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException({
          code: AuthErrorCode.INVALID_TOKEN,
          message: 'Refresh token has been revoked',
        });
      }

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        issuer,
        audience,
      });

      if (payload.jti) {
        const isJtiRevoked = await this.redisService.isTokenBlacklisted(payload.jti, 'jti');
        if (isJtiRevoked) {
          throw new UnauthorizedException({
            code: AuthErrorCode.INVALID_TOKEN,
            message: 'Refresh token has been revoked',
          });
        }
        await this.redisService.setBlacklistToken(payload.jti, 1209600, 'jti');
      }

      return this.login({
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      });
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Invalid refresh token',
      });
    }
  }

  /**
   * Đăng xuất và thu hồi (revoke) token phía server bằng Redis.
   */
  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    if (accessToken) {
      await this.redisService.setBlacklistToken(accessToken, 86400);
    }
    if (refreshToken) {
      await this.redisService.setBlacklistToken(refreshToken, 1209600);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.redisService.isTokenBlacklisted(token);
  }
}
