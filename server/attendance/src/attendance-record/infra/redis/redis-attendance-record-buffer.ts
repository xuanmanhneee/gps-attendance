// infra/redis/redis-attendance-record.buffer.ts
import { Injectable } from '@nestjs/common';

import {
  AttendanceRecord,
  MarkPresentInput,
} from '../../attendance-record.model';
import { AttendanceReviewCandidate } from '../../attendance-review.model';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
  ResolveReviewResult,
} from '../../attendance-record.buffer';
import { RedisService } from '../../../redis/redis.service'; // chỉnh path đúng theo project

const keyFor = (sessionId: number) => `attendance:buffer:${sessionId}`;
const flushingKeyFor = (sessionId: number) =>
  `attendance:buffer-flushing:${sessionId}`;
const deviceKeyFor = (sessionId: number, deviceId: string) =>
  `attendance:device:${sessionId}:${deviceId}`;
const reviewKeyFor = (sessionId: number) => `attendance:review:${sessionId}`;

// Kiểm tra record và giữ device trong cùng một thao tác Redis. Hai request
// đồng thời không thể cùng ghi present hoặc dùng chung một device.
const MARK_PRESENT_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 then return 4 end
local existing = redis.call('HGET', KEYS[1], ARGV[1])
if not existing then return 0 end
local rec = cjson.decode(existing)
if rec.status == 'present' then return 1 end
if rec.status ~= 'absent' or (rec.updateBy ~= nil and rec.updateBy ~= cjson.null) then return 5 end
if ARGV[4] == 'REVIEW' then
  redis.call('HSET', KEYS[4], ARGV[1], ARGV[5])
  return 6
end
if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
redis.call('HDEL', KEYS[4], ARGV[1])
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
return 3
`;

const RESOLVE_REVIEW_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 then return {4} end
local existing = redis.call('HGET', KEYS[1], ARGV[1])
if not existing then return {0} end
local rec = cjson.decode(existing)
local candidateRaw = redis.call('HGET', KEYS[3], ARGV[1])
if not candidateRaw then return {2} end
local candidate = cjson.decode(candidateRaw)
if rec.updateBy ~= nil and rec.updateBy ~= cjson.null then return {1} end
if rec.status ~= 'absent' then return {1} end
local previousStatus = rec.status
if ARGV[2] == 'approve' then rec.status = 'present' else rec.status = 'absent' end
if ARGV[2] == 'approve' then
  rec.checkedInAt = candidate.createdAt
end
rec.updateBy = tonumber(ARGV[3])
rec.updatedAt = ARGV[4]
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(rec))
redis.call('HDEL', KEYS[3], ARGV[1])
return {3, previousStatus, cjson.encode(rec), candidateRaw}
`;

const BEGIN_SESSION_FLUSH_SCRIPT = `
redis.call('SET', KEYS[2], '1')
return redis.call('HVALS', KEYS[1])
`;

const COMPLETE_SESSION_FLUSH_SCRIPT = `
return redis.call('DEL', KEYS[1], KEYS[2], KEYS[3])
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
        'attendance:buffer:[0-9]*',
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
      status: input.validationStatus === 'VALID' ? 'present' : 'absent',
      checkedInAt:
        input.validationStatus === 'VALID' ? input.checkedInAt : null,
      latitude: input.validationStatus === 'VALID' ? input.latitude : null,
      longitude: input.validationStatus === 'VALID' ? input.longitude : null,
      accuracy: input.validationStatus === 'VALID' ? input.accuracy : null,
      updateBy: input.validationStatus === 'VALID' ? input.updateBy : null,
      updatedAt: new Date(),
      ...(input.validationStatus === 'REVIEW'
        ? { reasons: input.reasons }
        : {}),
    };
    const result = await this.redisService.eval(
      MARK_PRESENT_SCRIPT,
      [
        keyFor(input.sessionId),
        deviceKeyFor(input.sessionId, deviceId),
        flushingKeyFor(input.sessionId),
        reviewKeyFor(input.sessionId),
      ],
      [
        String(input.userId),
        JSON.stringify(record),
        String(deviceTtlSeconds),
        input.validationStatus,
        JSON.stringify({
          sessionId: input.sessionId,
          userId: input.userId,
          reasons: input.reasons ?? [],
          createdAt: new Date().toISOString(),
        }),
      ],
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
      case 5:
        return 'locked';
      case 6:
        return 'review';
      default:
        throw new Error(`Unexpected check-in commit result: ${String(result)}`);
    }
  }

  async resolveReview(
    sessionId: number,
    userId: number,
    decision: 'approve' | 'reject',
    resolverId: number,
  ): Promise<ResolveReviewResult> {
    const result = await this.redisService.eval(
      RESOLVE_REVIEW_SCRIPT,
      [keyFor(sessionId), flushingKeyFor(sessionId), reviewKeyFor(sessionId)],
      [String(userId), decision, String(resolverId), new Date().toISOString()],
    );
    if (!Array.isArray(result)) {
      throw new Error(`Unexpected review resolution result: ${String(result)}`);
    }
    const code = Number(result[0]);
    if (code === 3) {
      return {
        status: 'resolved',
        previousStatus: String(result[1]) as AttendanceRecord['status'],
        record: this.deserialize(String(result[2])),
        candidate: this.deserializeCandidate(String(result[3])),
      };
    }
    const failures = [
      'record-missing',
      'locked',
      'not-requested',
      '',
      'session-flushing',
    ] as const;
    const status = failures[code];
    if (!status)
      throw new Error(`Unexpected review resolution result: ${String(result)}`);
    return { status };
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
      [keyFor(sessionId), flushingKeyFor(sessionId), reviewKeyFor(sessionId)],
      [],
    );
  }

  async clearSession(sessionId: number): Promise<void> {
    await this.completeSessionFlush(sessionId);
  }

  async findReviewCandidates(
    sessionId: number,
  ): Promise<AttendanceReviewCandidate[]> {
    const all = await this.redisService.hgetall(reviewKeyFor(sessionId));
    return Object.values(all).map((raw) => this.deserializeCandidate(raw));
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

  private deserializeCandidate(raw: string): AttendanceReviewCandidate {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
    };
  }
}
