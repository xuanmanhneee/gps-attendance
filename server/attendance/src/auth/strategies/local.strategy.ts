import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from './../auth.service';
import { LoginAttemptLimiter } from '../login-attempt.limiter';
import { User } from '../../users/user.model';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly loginAttempts: LoginAttemptLimiter,
  ) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  async validate(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    await this.loginAttempts.beginAttempt(username);

    const user = await this.authService.validateUser(username, password);
    await this.loginAttempts.recordSuccess(username);
    return user;
  }
}
