import { Injectable } from '@nestjs/common';
import { StudentAttendanceHistoryItemDto } from '@gps-attendance/shared';
import { AttendanceRecord } from '../attendance-record.model';
import { IAttendanceRecordRepository } from '../attendance-record.repository';

@Injectable()
export class InMemoryAttendanceRecordStore implements IAttendanceRecordRepository {
  private recordsBySession = new Map<number, Map<number, AttendanceRecord>>(); // sessionId → userId → record

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

  async findDetailedHistoryByUser(
    userId: number,
  ): Promise<StudentAttendanceHistoryItemDto[]> {
    const records = await this.findByUser(userId);
    return records.map((r) => ({
      id: r.sessionId,
      sessionId: r.sessionId,
      sessionTitle: `Buổi học #${r.sessionId}`,
      sessionStatus: 'closed' as const,
      openAt: new Date().toISOString(),
      closeAt: new Date().toISOString(),
      radius: 50,
      sessionLatitude: 0,
      sessionLongitude: 0,
      status: r.status,
      checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
      deviceId: r.deviceId,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      distanceMeters: r.distanceMeters,
    }));
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
}
