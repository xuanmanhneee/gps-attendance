import { Injectable } from '@nestjs/common';
import { AttendanceRecord } from '../attendance-record.model';
import { IAttendanceRecordBuffer } from '#attendance-record/attendance-record.buffer';

@Injectable()
export class InMemoryAttendanceRecordStore implements IAttendanceRecordBuffer {
  private recordsBySession = new Map<number, Map<number, AttendanceRecord>>();

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    return this.recordsBySession.get(sessionId)?.get(userId) ?? null;
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    const result: AttendanceRecord[] = [];
    for (const sessionMap of this.recordsBySession.values()) {
      const r = sessionMap.get(userId);
      if (r) result.push(r);
    }
    return result;
  }

  async findBySession(sessionId: number): Promise<AttendanceRecord[]> {
    return [...(this.recordsBySession.get(sessionId)?.values() ?? [])];
  }

  async upsertRecord(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    let sessionMap = this.recordsBySession.get(record.sessionId);
    if (!sessionMap) {
      sessionMap = new Map();
      this.recordsBySession.set(record.sessionId, sessionMap);
    }
    sessionMap.set(record.userId, { ...record, updatedAt: new Date() });
  }

  async clearSession(sessionId: number): Promise<void> {
    this.recordsBySession.delete(sessionId);
  }
}
