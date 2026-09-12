import * as bcrypt from 'bcryptjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthErrorCode, LoginResponse } from '@gps-attendance/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    let isPasswordValid = false;
    if (
      account.password.startsWith('$2a$') ||
      account.password.startsWith('$2b$') ||
      account.password.startsWith('$2y$')
    ) {
      isPasswordValid = await bcrypt.compare(password, account.password);
    } else {
      // Hỗ trợ backward compatibility với dữ liệu plaintext cũ nếu chưa seed lại
      isPasswordValid = account.password === password;
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const user = await this.usersService.findByAccountId(account.id);

    if (!user) {
      throw new UnauthorizedException({
        code: AuthErrorCode.ACCOUNT_NOT_LINKED,
        message: 'Tài khoản chưa được liên kết với hồ sơ người dùng.',
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
    const payload: JwtPayload = {
      sub: user.userId,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
