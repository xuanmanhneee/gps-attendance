import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByUsername(username);

    // So sánh plain text tạm thời. Sau này đổi thành:
    // await bcrypt.compare(password, user.password)
    if (!user || user.password !== password) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }

    const { password: _password, ...result } = user;
    return result;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);

    const payload = { sub: user.id, username: user.username, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}