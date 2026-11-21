import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { JwtPayload } from './strategies/jwt.strategy';
import {
  AuthErrorCode,
  type LoginResponse,
  type Role,
} from '@gps-attendance/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { REFRESH_SESSION_REPOSITORY } from './refresh-session.repository.token';
import type { IRefreshSessionRepository } from './refresh-session.repository';
import { UNIT_OF_WORK } from '#common/unit-of-work/unit-of-work.token';
import type { IUnitOfWork } from '#common/unit-of-work/unit-of-work.interface';
import { ConcurrencyGate } from '../common/concurrency/concurrency-gate';

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const intFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

// bcrypt chạy trên thread pool libuv, dùng chung với DNS/fs. Chỉ cho chạy
// (thread pool - 1) lần băm cùng lúc để luôn còn một thread cho việc mở kết
// nối PostgreSQL mới; phần dư xếp hàng trong bộ nhớ và bị từ chối 503 khi hàng
// vượt BCRYPT_MAX_QUEUE. Xem ConcurrencyGate.
const passwordGate = new ConcurrencyGate(
  intFromEnv(
    'BCRYPT_CONCURRENCY',
    Math.max(1, intFromEnv('UV_THREADPOOL_SIZE', 4) - 1),
  ),
  intFromEnv('BCRYPT_MAX_QUEUE', 500),
);

// Hash giả (cùng cost với AccountService) để username không tồn tại vẫn tốn
// đúng một lần bcrypt.compare — nếu bỏ qua, thời gian phản hồi (~16 ms so với
// ~60 ms) cho phép dò xem username nào có thật.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

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

    const passwordMatches = await passwordGate.run(() =>
      bcrypt.compare(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH),
    );

    if (!account || !passwordMatches || account.status !== 'active') {
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

  private createAccessToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.userId,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async login(user: AuthenticatedUser): Promise<LoginResponse> {
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
    return { accessToken: this.createAccessToken(user), refreshToken };
  }

  /** Thu hồi refresh token; idempotent, token không tồn tại cũng không lỗi. */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshSessions.revoke(hashRefreshToken(refreshToken));
  }

  async refresh(
    refreshToken: string,
    allowedRoles: readonly Role[] = ['participant'],
  ): Promise<LoginResponse> {
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
    if (
      !account ||
      account.status !== 'active' ||
      !user ||
      !allowedRoles.includes(user.role)
    ) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Tài khoản không còn được phép đăng nhập',
      });
    }

    return {
      accessToken: this.createAccessToken({
        userId: user.id,
        username: account.username,
        role: user.role,
      }),
      refreshToken: nextToken,
    };
  }
}
