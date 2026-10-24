import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthErrorCode, type LoginResponse, type TokenPairResponse } from '@gps-attendance/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { REFRESH_SESSION_REPOSITORY } from './refresh-session.repository.token';
import type { IRefreshSessionRepository } from './refresh-session.repository';
import { UNIT_OF_WORK } from '#common/unit-of-work/unit-of-work.token';
import type { IUnitOfWork } from '#common/unit-of-work/unit-of-work.interface';

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly refreshSessions: IRefreshSessionRepository,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
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

    const isPasswordValid =
      account && (await bcrypt.compare(password, account.passwordHash));

    if (!isPasswordValid || account.status !== 'active') {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }

    const user = await this.usersService.findById(account.userId);

    if (!user) {
      throw new UnauthorizedException('Tài khoản chưa được liên kết với user');
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
    const payload: JwtPayload = {
      sub: user.userId,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async loginWithRefresh(user: AuthenticatedUser): Promise<TokenPairResponse> {
    const account = await this.accountService.findByUserId(user.userId);
    if (!account || account.status !== 'active') {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Tài khoản không hoạt động',
      });
    }

    const refreshToken = randomBytes(32).toString('base64url');
    await this.refreshSessions.create(
      account.id,
      hashRefreshToken(refreshToken),
      new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
    );
    return { ...this.login(user), refreshToken };
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    const nextToken = randomBytes(32).toString('base64url');
    const accountId = await this.unitOfWork.runInTransaction((ctx) =>
      this.refreshSessions.rotate(
        hashRefreshToken(refreshToken),
        hashRefreshToken(nextToken),
        new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
        ctx,
      ),
    );
    if (accountId === undefined) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn',
      });
    }

    const account = await this.accountService.findById(accountId);
    const user = account && (await this.usersService.findById(account.userId));
    if (!account || account.status !== 'active' || !user || user.role !== 'participant') {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Tài khoản không còn được phép đăng nhập',
      });
    }

    return {
      ...this.login({ userId: user.id, username: account.username, role: user.role }),
      refreshToken: nextToken,
    };
  }
}
