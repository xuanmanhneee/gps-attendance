// infra/redis/redis-attendance-record.buffer.ts
import { Injectable } from '@nestjs/common';

import { AttendanceRecord } from '../../attendance-record.model';
import { IAttendanceRecordBuffer } from '../../attendance-record.buffer';
import { RedisService } from '../../../redis/redis.service'; // chỉnh path đúng theo project

const keyFor = (sessionId: number) => `attendance:buffer:${sessionId}`;

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

  async clearSession(sessionId: number): Promise<void> {
    await this.redisService.del(keyFor(sessionId));
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