import { Injectable } from '@nestjs/common';
import { AttendanceRecord, MarkPresentInput } from '../attendance-record.model';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
} from '#attendance-record/attendance-record.buffer';

@Injectable()
export class InMemoryAttendanceRecordStore implements IAttendanceRecordBuffer {
  private recordsBySession = new Map<number, Map<number, AttendanceRecord>>();
  private usedDevicesBySession = new Map<number, Set<string>>();

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

  async insertRecordIfAbsent(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    if (!(await this.getRecord(record.sessionId, record.userId))) {
      await this.upsertRecord(record);
    }
  }

  async tryMarkPresentAndClaimDevice(
    input: MarkPresentInput,
    deviceId: string,
    _deviceTtlSeconds: number,
  ): Promise<MarkPresentResult> {
    const sessionMap = this.recordsBySession.get(input.sessionId);
    const existing = sessionMap?.get(input.userId);
    if (!existing) return 'record-missing';
    if (existing.status === 'present') return 'already-present';

    let usedDevices = this.usedDevicesBySession.get(input.sessionId);
    if (!usedDevices) {
      usedDevices = new Set<string>();
      this.usedDevicesBySession.set(input.sessionId, usedDevices);
    }
    if (usedDevices.has(deviceId)) return 'device-used';

    sessionMap!.set(input.userId, {
      ...input,
      status: 'present',
      updatedAt: new Date(),
    });
    usedDevices.add(deviceId);
    return 'present';
  }

  async clearSession(sessionId: number): Promise<void> {
    this.recordsBySession.delete(sessionId);
    this.usedDevicesBySession.delete(sessionId);
  }
}
