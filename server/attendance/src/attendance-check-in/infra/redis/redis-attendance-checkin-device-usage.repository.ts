// redis-attendance-checkin-device-usage.repository.ts
import { Injectable } from '@nestjs/common';

import { IAttendanceCheckInDeviceUsageRepository } from '../../repositories/attendance-check-in-device-usage.repository';
import { RedisService } from '#redis/redis.service';

const keyFor = (sessionId: number, deviceId: string) =>
  `attendance:device:${sessionId}:${deviceId}`;

const SAFETY_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class RedisAttendanceCheckInDeviceUsageRepository implements IAttendanceCheckInDeviceUsageRepository {
  constructor(private readonly redisService: RedisService) {} // đổi từ Redis sang RedisService

  async isUsed(sessionId: number, deviceId: string): Promise<boolean> {
    const exists = await this.redisService.exists(keyFor(sessionId, deviceId));
    return exists === 1;
  }

  async markUsed(sessionId: number, deviceId: string): Promise<boolean> {
    const result = await this.redisService.set(
      keyFor(sessionId, deviceId),
      '1',
      { ttlSec: SAFETY_TTL_SECONDS, ifNotExists: true },
    );
    return result === 'OK';
  }
}
