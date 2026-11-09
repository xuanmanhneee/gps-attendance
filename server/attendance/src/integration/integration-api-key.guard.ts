import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class IntegrationApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('INTEGRATION_API_KEY');
    if (!expected) {
      throw new ServiceUnavailableException(
        'Integration API chưa được cấu hình',
      );
    }

    const value = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-api-key');

    if (!value || !this.equals(value, expected)) {
      throw new UnauthorizedException({
        code: 'INTEGRATION_UNAUTHORIZED',
        message: 'API key không hợp lệ',
      });
    }
    return true;
  }

  private equals(value: string, expected: string): boolean {
    const left = Buffer.from(value);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
