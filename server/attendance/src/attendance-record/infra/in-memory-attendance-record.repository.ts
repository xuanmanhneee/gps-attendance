import { Injectable } from '@nestjs/common';
import { AttendanceRecord, MarkPresentInput } from '../attendance-record.model';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
  RequestReviewResult,
  ResolveReviewResult,
} from '#attendance-record/attendance-record.buffer';

@Injectable()
export class InMemoryAttendanceRecordStore implements IAttendanceRecordBuffer {
  private recordsBySession = new Map<number, Map<number, AttendanceRecord>>();
  private usedDevicesBySession = new Map<number, Set<string>>();
  private flushingSessions = new Set<number>();

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
    if (this.flushingSessions.has(input.sessionId)) return 'session-flushing';

    const sessionMap = this.recordsBySession.get(input.sessionId);
    const existing = sessionMap?.get(input.userId);
    if (!existing) return 'record-missing';
    if (existing.status === 'present') return 'already-present';
    if (existing.status !== 'absent' || existing.updateBy !== null)
      return 'locked';

    if (input.validationStatus === 'REVIEW') {
      sessionMap!.set(input.userId, {
        sessionId: input.sessionId,
        userId: input.userId,
        status: 'absent',
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        updateBy: null,
        updatedAt: new Date(),
        reasons: input.reasons,
      });
      return 'review';
    }

    let usedDevices = this.usedDevicesBySession.get(input.sessionId);
    if (!usedDevices) {
      usedDevices = new Set<string>();
      this.usedDevicesBySession.set(input.sessionId, usedDevices);
    }
    if (usedDevices.has(deviceId)) return 'device-used';

    sessionMap!.set(input.userId, {
      sessionId: input.sessionId,
      userId: input.userId,
      status: 'present',
      checkedInAt: input.checkedInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      updateBy: input.updateBy,
      updatedAt: new Date(),
    });
    usedDevices.add(deviceId);
    return 'present';
  }

  async requestReview(
    sessionId: number,
    userId: number,
    note?: string,
  ): Promise<RequestReviewResult> {
    if (this.flushingSessions.has(sessionId)) return 'session-flushing';
    const record = this.recordsBySession.get(sessionId)?.get(userId);
    if (!record) return 'record-missing';
    if (record.updateBy !== null) return 'locked';
    if (record.status !== 'absent' || !record.reasons?.length)
      return 'not-eligible';
    Object.assign(record, {
      reviewRequested: true,
      note,
      updatedAt: new Date(),
    });
    return 'requested';
  }

  async resolveReview(
    sessionId: number,
    userId: number,
    decision: 'approve' | 'reject',
    resolverId: number,
  ): Promise<ResolveReviewResult> {
    if (this.flushingSessions.has(sessionId))
      return { status: 'session-flushing' };
    const record = this.recordsBySession.get(sessionId)?.get(userId);
    if (!record) return { status: 'record-missing' };
    if (record.updateBy !== null) return { status: 'locked' };
    if (record.status !== 'absent' || record.reviewRequested !== true) {
      return { status: 'not-requested' };
    }
    const previousStatus = record.status;
    Object.assign(record, {
      status: decision === 'approve' ? 'present' : 'absent',
      updateBy: resolverId,
      updatedAt: new Date(),
    });
    return { status: 'resolved', previousStatus, record: { ...record } };
  }

  async beginSessionFlush(sessionId: number): Promise<AttendanceRecord[]> {
    this.flushingSessions.add(sessionId);
    return this.findBySession(sessionId);
  }

  async completeSessionFlush(sessionId: number): Promise<void> {
    this.recordsBySession.delete(sessionId);
    this.usedDevicesBySession.delete(sessionId);
    this.flushingSessions.delete(sessionId);
  }

  async clearSession(sessionId: number): Promise<void> {
    await this.completeSessionFlush(sessionId);
  }
}
