// infra/redis/redis-attendance-record.buffer.ts
import { Injectable, OnModuleInit } from '@nestjs/common';

import {
  AttendanceRecord,
  MarkPresentInput,
} from '../../attendance-record.model';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
  ResolveAttendanceReviewRecordResult,
} from '../../attendance-record.buffer';
import { RedisService } from '../../../redis/redis.service'; // chỉnh path đúng theo project

const keyFor = (sessionId: number) => `attendance:buffer:${sessionId}`;
// Tập sessionId đang có buffer. findByUser đọc tập này thay vì SCAN toàn bộ
// keyspace (gồm cả hàng nghìn key device của mỗi phiên).
const OPEN_BUFFERS_KEY = 'attendance:open-buffers';
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
  local rec = cjson.decode(existing)
  if rec.status == 'present' then return 1 end
  if rec.status ~= 'absent' or (rec.updateBy ~= nil and rec.updateBy ~= cjson.null) then return 5 end
  if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
  return 3
`;

const RESOLVE_REVIEW_RECORD_SCRIPT = `
  if redis.call('EXISTS', KEYS[2]) == 1 then return {4} end
  local existing = redis.call('HGET', KEYS[1], ARGV[1])
  if not existing then return {0} end
  local rec = cjson.decode(existing)
  if rec.updateBy ~= nil and rec.updateBy ~= cjson.null then return {1} end
  if rec.status ~= 'absent' then return {1} end
  local previousStatus = rec.status
  if ARGV[2] == 'approve' then rec.status = 'present' else rec.status = 'absent' end
  if ARGV[2] == 'approve' then
    rec.checkedInAt = ARGV[4]
  end
  rec.updateBy = tonumber(ARGV[3])
  rec.updatedAt = ARGV[5]
  redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(rec))
  return {3, previousStatus, cjson.encode(rec)}
`;

// HSETNX cho cả lô trong một lần gọi: ARGV[1] là sessionId, sau đó là các
// cặp (userId, record). Ghi sessionId vào tập chỉ mục trong cùng thao tác.
const INSERT_RECORDS_IF_ABSENT_SCRIPT = `
  redis.call('SADD', KEYS[2], ARGV[1])
  for i = 2, #ARGV, 2 do
    redis.call('HSETNX', KEYS[1], ARGV[i], ARGV[i + 1])
  end
  return 0
`;

// Lấy record của một user ở mọi buffer trong một lần gọi. Phần tử rỗng là
// buffer không có user đó (Lua cắt mảng tại nil nên không trả nil).
const FIND_BY_USER_SCRIPT = `
  local result = {}
  for i, key in ipairs(KEYS) do
    result[i] = redis.call('HGET', key, ARGV[1]) or ''
  end
  return result
`;

// Số record mỗi lần gọi script. Lua chặn Redis trong lúc chạy, nên chia lô
// để một lớp lớn không làm các check-in khác phải chờ lâu.
const INSERT_BATCH_SIZE = 500;

const BEGIN_SESSION_FLUSH_SCRIPT = `
  redis.call('SET', KEYS[2], '1')
  return redis.call('HVALS', KEYS[1])
`;

const COMPLETE_SESSION_FLUSH_SCRIPT = `
  redis.call('SREM', KEYS[3], ARGV[1])
  return redis.call('DEL', KEYS[1], KEYS[2])
`;

@Injectable()
export class RedisAttendanceRecordBuffer
  implements IAttendanceRecordBuffer, OnModuleInit
{
  constructor(private readonly redisService: RedisService) {}

  // Buffer tạo trước khi có tập chỉ mục (bản cũ đang chạy lúc deploy) chưa
  // nằm trong tập; quét một lần lúc khởi động để sinh viên không mất phiên
  // đang mở trên màn hình của mình.
  async onModuleInit(): Promise<void> {
    const sessionIds: string[] = [];
    let cursor = '0';
    do {
      const [next, keys] = await this.redisService.scan(
        cursor,
        'attendance:buffer:[0-9]*',
        1000,
      );
      cursor = next;
      for (const key of keys) {
        sessionIds.push(key.slice('attendance:buffer:'.length));
      }
    } while (cursor !== '0');

    if (sessionIds.length > 0) {
      await this.redisService.sadd(OPEN_BUFFERS_KEY, ...sessionIds);
    }
  }

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    const raw = await this.redisService.hget(keyFor(sessionId), String(userId));
    return raw ? this.deserialize(raw) : null;
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    const sessionIds = await this.redisService.smembers(OPEN_BUFFERS_KEY);
    if (sessionIds.length === 0) return [];

    const result = await this.redisService.eval(
      FIND_BY_USER_SCRIPT,
      sessionIds.map((id) => keyFor(Number(id))),
      [String(userId)],
    );
    if (!Array.isArray(result)) {
      throw new Error(`Unexpected find-by-user result: ${String(result)}`);
    }

    return result
      .map(String)
      .filter((raw) => raw !== '')
      .map((raw) => this.deserialize(raw));
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
    await this.redisService.sadd(OPEN_BUFFERS_KEY, String(record.sessionId));
  }

  async insertRecordsIfAbsent(
    records: Omit<AttendanceRecord, 'updatedAt'>[],
  ): Promise<void> {
    const updatedAt = new Date();
    const bySession = new Map<number, string[]>();
    for (const record of records) {
      const args = bySession.get(record.sessionId) ?? [];
      const full: AttendanceRecord = { ...record, updatedAt };
      args.push(String(record.userId), JSON.stringify(full));
      bySession.set(record.sessionId, args);
    }

    for (const [sessionId, args] of bySession) {
      for (let i = 0; i < args.length; i += INSERT_BATCH_SIZE * 2) {
        await this.redisService.eval(
          INSERT_RECORDS_IF_ABSENT_SCRIPT,
          [keyFor(sessionId), OPEN_BUFFERS_KEY],
          [String(sessionId), ...args.slice(i, i + INSERT_BATCH_SIZE * 2)],
        );
      }
    }
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
      case 5:
        return 'locked';
      default:
        throw new Error(`Unexpected check-in commit result: ${String(result)}`);
    }
  }

  async resolveReviewRecord(
    sessionId: number,
    userId: number,
    decision: 'approve' | 'reject',
    resolverId: number,
    candidateCreatedAt: Date,
  ): Promise<ResolveAttendanceReviewRecordResult> {
    const result = await this.redisService.eval(
      RESOLVE_REVIEW_RECORD_SCRIPT,
      [keyFor(sessionId), flushingKeyFor(sessionId)],
      [
        String(userId),
        decision,
        String(resolverId),
        candidateCreatedAt.toISOString(),
        new Date().toISOString(),
      ],
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
      };
    }
    switch (code) {
      case 0:
        return { status: 'record-missing' };
      case 1:
        return { status: 'locked' };
      case 4:
        return { status: 'session-flushing' };
      default:
        throw new Error(
          `Unexpected review resolution result: ${String(result)}`,
        );
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
      [keyFor(sessionId), flushingKeyFor(sessionId), OPEN_BUFFERS_KEY],
      [String(sessionId)],
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
      // Buffer từ phiên bản cũ dùng 0 làm sentinel cho system/self.
      // updated_by hiện là FK nullable tới users.id nên chuẩn hóa về null.
      updateBy: parsed.updateBy === 0 ? null : parsed.updateBy,
      updatedAt: new Date(parsed.updatedAt),
    };
  }
}
