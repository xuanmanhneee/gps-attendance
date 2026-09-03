import { Injectable } from '@nestjs/common';
import { AttendanceRecord } from '../attendance-record.model';
import { IAttendanceRecordStore } from '../attendance-record.store';

@Injectable()
export class InMemoryAttendanceRecordStore implements IAttendanceRecordStore {
  private records = new Map<string, AttendanceRecord>();
  private attempts = new Map<string, number>();

  private key(sessionId: number, userId: number): string {
    return `${sessionId}:${userId}`;
  }

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    return this.records.get(this.key(sessionId, userId)) ?? null;
  }

  async upsertRecord(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    const k = this.key(record.sessionId, record.userId);
    this.records.set(k, { ...record, updatedAt: new Date() });
  }

  async incrementAttempt(sessionId: number, userId: number): Promise<number> {
    const k = this.key(sessionId, userId);
    const next = (this.attempts.get(k) ?? 0) + 1;
    this.attempts.set(k, next);
    return next;
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    return this.attempts.get(this.key(sessionId, userId)) ?? 0;
  }

  async clearSession(sessionId: number): Promise<void> {
    const prefix = `${sessionId}:`;
    for (const k of this.records.keys()) {
      if (k.startsWith(prefix)) this.records.delete(k);
    }
    for (const k of this.attempts.keys()) {
      if (k.startsWith(prefix)) this.attempts.delete(k);
    }
  }
}
