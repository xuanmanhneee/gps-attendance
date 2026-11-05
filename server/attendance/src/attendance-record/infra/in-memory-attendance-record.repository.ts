import { Injectable } from '@nestjs/common';
import { AttendanceRecord, MarkPresentInput } from '../attendance-record.model';
import { AttendanceReviewCandidate } from '../attendance-review.model';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
  ResolveReviewResult,
} from '#attendance-record/attendance-record.buffer';

@Injectable()
export class InMemoryAttendanceRecordStore implements IAttendanceRecordBuffer {
  private recordsBySession = new Map<number, Map<number, AttendanceRecord>>();
  private usedDevicesBySession = new Map<number, Set<string>>();
  private reviewCandidatesBySession = new Map<
    number,
    Map<number, AttendanceReviewCandidate>
  >();
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
      let candidates = this.reviewCandidatesBySession.get(input.sessionId);
      if (!candidates) {
        candidates = new Map();
        this.reviewCandidatesBySession.set(input.sessionId, candidates);
      }
      candidates.set(input.userId, {
        sessionId: input.sessionId,
        userId: input.userId,
        reasons: input.reasons ?? [],
        createdAt: new Date(),
      });
      return 'review';
    }

    let usedDevices = this.usedDevicesBySession.get(input.sessionId);
    if (!usedDevices) {
      usedDevices = new Set<string>();
      this.usedDevicesBySession.set(input.sessionId, usedDevices);
    }
    if (usedDevices.has(deviceId)) return 'device-used';

    this.reviewCandidatesBySession.get(input.sessionId)?.delete(input.userId);
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
    const candidate = this.reviewCandidatesBySession.get(sessionId)?.get(userId);
    if (!candidate) return { status: 'not-requested' };
    if (record.updateBy !== null) return { status: 'locked' };
    if (record.status !== 'absent') {
      return { status: 'not-requested' };
    }
    const previousStatus = record.status;
    Object.assign(record, {
      status: decision === 'approve' ? 'present' : 'absent',
      ...(decision === 'approve'
        ? {
            checkedInAt: candidate.createdAt,
          }
        : {}),
      updateBy: resolverId,
      updatedAt: new Date(),
    });
    this.reviewCandidatesBySession.get(sessionId)!.delete(userId);
    return {
      status: 'resolved',
      previousStatus,
      record: { ...record },
      candidate: { ...candidate },
    };
  }

  async findReviewCandidates(
    sessionId: number,
  ): Promise<AttendanceReviewCandidate[]> {
    return [
      ...(this.reviewCandidatesBySession.get(sessionId)?.values() ?? []),
    ];
  }

  async beginSessionFlush(sessionId: number): Promise<AttendanceRecord[]> {
    this.flushingSessions.add(sessionId);
    return this.findBySession(sessionId);
  }

  async completeSessionFlush(sessionId: number): Promise<void> {
    this.recordsBySession.delete(sessionId);
    this.usedDevicesBySession.delete(sessionId);
    this.reviewCandidatesBySession.delete(sessionId);
    this.flushingSessions.delete(sessionId);
  }

  async clearSession(sessionId: number): Promise<void> {
    await this.completeSessionFlush(sessionId);
  }
}
