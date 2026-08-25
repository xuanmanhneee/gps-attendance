import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AccountService } from '../account/account.service';
import { UsersService } from '../users/users.service';
import type { User } from '../users/user.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<User> {
    const account =
      await this.accountService.findByUsername(username);

    // Plain text tạm thời.
    // Sau này:
    // await bcrypt.compare(password, account.password)
    if (!account || account.password !== password) {
      throw new UnauthorizedException(
        'Sai tài khoản hoặc mật khẩu',
      );
    }

    const user =
      await this.usersService.findByAccountId(account.id);

    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản chưa được liên kết với user',
      );
    }

    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(
      username,
      password,
    );

    const payload = {
      sub: user.id,
      code: user.code,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}