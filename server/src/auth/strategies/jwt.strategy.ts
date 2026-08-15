import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // TODO: chuyển sang biến môi trường (process.env.JWT_SECRET) trước khi lên production
      secretOrKey: 'dev-secret-key-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    // Trả về gì ở đây sẽ được gắn vào request.user
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}