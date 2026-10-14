import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from '../rate-limit/rate-limit.service';

@Injectable()
export class DeviceRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { body?: any }>();
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';
    const deviceId =
      req.headers['x-device-id'] ??
      req.body?.device?.deviceId ??
      req.body?.deviceId ??
      'anonymous-device';

    const ipLimit = await this.rateLimitService.allowRequest(
      `ip:${clientIp}`,
      60,
      60,
    );
    const deviceLimit = await this.rateLimitService.allowRequest(
      `device:${String(deviceId)}`,
      30,
      60,
    );

    if (!ipLimit.allowed || !deviceLimit.allowed) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Quá nhiều request từ IP hoặc thiết bị này, vui lòng chờ một lúc rồi thử lại.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
