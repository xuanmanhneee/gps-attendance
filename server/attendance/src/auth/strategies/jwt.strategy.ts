import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { AuthErrorCode, Role } from '@gps-attendance/shared';
import { RedisService } from '../../redis/redis.service';

export interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
  jti?: string;
  iss?: string;
  aud?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const issuer = configService.get<string>('JWT_ISSUER') ?? 'gps-attendance';
    const audience = configService.get<string>('JWT_AUDIENCE') ?? 'gps-attendance-app';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      issuer,
      audience,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload): Promise<AuthenticatedUser> {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken && (await this.redisService.isTokenBlacklisted(rawToken))) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Token has been revoked',
      });
    }

    if (payload.jti && (await this.redisService.isTokenBlacklisted(payload.jti, 'jti'))) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Session token has been revoked',
      });
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}

