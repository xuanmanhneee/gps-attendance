import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginResponse } from '@gps-attendance/shared';
import * as bcrypt from 'bcrypt';
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

    const isPasswordValid =
      account && (await bcrypt.compare(password, account.passwordHash));

    if (!isPasswordValid) {
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
}
