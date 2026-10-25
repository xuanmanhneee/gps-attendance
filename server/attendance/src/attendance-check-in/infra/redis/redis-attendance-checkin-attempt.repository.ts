// redis-attendance-checkin-attempt.repository.ts
import { Injectable } from '@nestjs/common';

import { IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import { RedisService } from '#redis/redis.service'; // chỉnh path đúng theo project

const keyFor = (sessionId: number, userId: number) =>
  `attendance:attempt-window:v2:${sessionId}:${userId}`;

const TRY_RECORD_ATTEMPT_SCRIPT = `
local time = redis.call('TIME')
local nowMs = time[1] * 1000 + math.floor(time[2] / 1000)
local windowMs = tonumber(ARGV[1])
local maxAttempts = tonumber(ARGV[2])
local cutoff = nowMs - windowMs

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)

local count = redis.call('ZCARD', KEYS[1])
if count >= maxAttempts then
  return 0
end

local member = time[1] .. ':' .. time[2] .. ':' .. count
redis.call('ZADD', KEYS[1], nowMs, member)
redis.call('PEXPIRE', KEYS[1], windowMs)
return 1
`;

@Injectable()
export class RedisAttendanceCheckInAttemptRepository implements IAttendanceCheckInAttemptRepository {
  constructor(private readonly redisService: RedisService) {}

  async tryRecordAttempt(
    sessionId: number,
    userId: number,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const result = await this.redisService.eval(
      TRY_RECORD_ATTEMPT_SCRIPT,
      [keyFor(sessionId, userId)],
      [String(windowSeconds * 1000), String(maxAttempts)],
    );

    return Number(result) === 1;
  }
}
