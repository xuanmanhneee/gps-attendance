// infra/redis/redis-attendance-record.buffer.ts
import { Injectable } from '@nestjs/common';

import {
  AttendanceRecord,
  MarkPresentInput,
} from '../../attendance-record.model';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
} from '../../attendance-record.buffer';
import { RedisService } from '../../../redis/redis.service'; // chỉnh path đúng theo project

const keyFor = (sessionId: number) => `attendance:buffer:${sessionId}`;
const flushingKeyFor = (sessionId: number) =>
  `attendance:buffer-flushing:${sessionId}`;
const deviceKeyFor = (sessionId: number, deviceId: string) =>
  `attendance:device:${sessionId}:${deviceId}`;

// Kiểm tra record và giữ device trong cùng một thao tác Redis. Hai request
// đồng thời không thể cùng ghi present hoặc dùng chung một device.
const MARK_PRESENT_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 then return 4 end
local existing = redis.call('HGET', KEYS[1], ARGV[1])
if not existing then return 0 end
if cjson.decode(existing).status == 'present' then return 1 end
if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
return 3
`;

const BEGIN_SESSION_FLUSH_SCRIPT = `
redis.call('SET', KEYS[2], '1')
return redis.call('HVALS', KEYS[1])
`;

const COMPLETE_SESSION_FLUSH_SCRIPT = `
return redis.call('DEL', KEYS[1], KEYS[2])
`;

@Injectable()
export class RedisAttendanceRecordBuffer implements IAttendanceRecordBuffer {
  constructor(private readonly redisService: RedisService) {}

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    const raw = await this.redisService.hget(keyFor(sessionId), String(userId));
    return raw ? this.deserialize(raw) : null;
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    // Không có index theo userId trong buffer; quét toàn bộ session key
    // đang mở. Chấp nhận được vì số session mở cùng lúc luôn nhỏ, và
    // buffer chỉ tồn tại tạm thời (bị xoá ngay sau flush).
    const result: AttendanceRecord[] = [];
    let cursor = '0';

    do {
      const [next, keys] = await this.redisService.scan(
        cursor,
        'attendance:buffer:*',
        100,
      );
      cursor = next;

      for (const key of keys) {
        const raw = await this.redisService.hget(key, String(userId));
        if (raw) result.push(this.deserialize(raw));
      }
    } while (cursor !== '0');

    return result;
  }

  async findBySession(sessionId: number): Promise<AttendanceRecord[]> {
    const all = await this.redisService.hgetall(keyFor(sessionId));
    return Object.values(all).map((raw) => this.deserialize(raw));
  }

  async upsertRecord(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    const full: AttendanceRecord = { ...record, updatedAt: new Date() };
    await this.redisService.hset(
      keyFor(record.sessionId),
      String(record.userId),
      JSON.stringify(full),
    );
  }

  async insertRecordIfAbsent(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    const full: AttendanceRecord = { ...record, updatedAt: new Date() };
    await this.redisService.hsetnx(
      keyFor(record.sessionId),
      String(record.userId),
      JSON.stringify(full),
    );
  }

  async tryMarkPresentAndClaimDevice(
    input: MarkPresentInput,
    deviceId: string,
    deviceTtlSeconds: number,
  ): Promise<MarkPresentResult> {
    const record: AttendanceRecord = {
      sessionId: input.sessionId,
      userId: input.userId,
      status: 'present',
      checkedInAt: input.checkedInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      updateBy: input.updateBy,
      updatedAt: new Date(),
    };
    const result = await this.redisService.eval(
      MARK_PRESENT_SCRIPT,
      [
        keyFor(input.sessionId),
        deviceKeyFor(input.sessionId, deviceId),
        flushingKeyFor(input.sessionId),
      ],
      [String(input.userId), JSON.stringify(record), String(deviceTtlSeconds)],
    );

    switch (result) {
      case 0:
        return 'record-missing';
      case 1:
        return 'already-present';
      case 2:
        return 'device-used';
      case 3:
        return 'present';
      case 4:
        return 'session-flushing';
      default:
        throw new Error(`Unexpected check-in commit result: ${String(result)}`);
    }
  }

  async beginSessionFlush(sessionId: number): Promise<AttendanceRecord[]> {
    const result = await this.redisService.eval(
      BEGIN_SESSION_FLUSH_SCRIPT,
      [keyFor(sessionId), flushingKeyFor(sessionId)],
      [],
    );
    if (!Array.isArray(result)) {
      throw new Error(`Unexpected session flush result: ${String(result)}`);
    }

    return result.map((raw) => this.deserialize(String(raw)));
  }

  async completeSessionFlush(sessionId: number): Promise<void> {
    await this.redisService.eval(
      COMPLETE_SESSION_FLUSH_SCRIPT,
      [keyFor(sessionId), flushingKeyFor(sessionId)],
      [],
    );
  }

  async clearSession(sessionId: number): Promise<void> {
    await this.completeSessionFlush(sessionId);
  }

  private deserialize(raw: string): AttendanceRecord {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      // JSON.stringify biến Date thành string ISO — parse lại để giữ
      // đúng kiểu Date như AttendanceRecord yêu cầu.
      checkedInAt: parsed.checkedInAt ? new Date(parsed.checkedInAt) : null,
      updatedAt: new Date(parsed.updatedAt),
    };
  }
}
