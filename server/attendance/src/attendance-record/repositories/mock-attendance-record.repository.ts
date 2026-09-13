import { Injectable } from '@nestjs/common';
import { StudentAttendanceHistoryItemDto } from '@gps-attendance/shared';
import { AttendanceRecord } from '../attendance-record.model';
import { IAttendanceRecordRepository } from '../attendance-record.repository';

@Injectable()
export class MockAttendanceRecordRepository
  implements IAttendanceRecordRepository
{
  private records: AttendanceRecord[] = [];
  private attempts = new Map<string, number>();

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    return (
      this.records.find(
        (r) => r.sessionId === sessionId && r.userId === userId,
      ) ?? null
    );
  }

  async upsertRecord(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    const index = this.records.findIndex(
      (r) => r.sessionId === record.sessionId && r.userId === record.userId,
    );

    const now = new Date();
    const updated: AttendanceRecord = { ...record, updatedAt: now };

    if (index >= 0) {
      this.records[index] = updated;
    } else {
      this.records.push(updated);
    }
  }

  async incrementAttempt(sessionId: number, userId: number): Promise<number> {
    const key = `${sessionId}:${userId}`;
    const count = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, count);
    return count;
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    const key = `${sessionId}:${userId}`;
    return this.attempts.get(key) ?? 0;
  }

  async clearSession(sessionId: number): Promise<void> {
    this.records = this.records.filter((r) => r.sessionId !== sessionId);
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    return this.records.filter((r) => r.userId === userId);
  }

  async findBySession(sessionId: number): Promise<AttendanceRecord[]> {
    return this.records.filter((r) => r.sessionId === sessionId);
  }

  async findDetailedHistoryByUser(
    userId: number,
  ): Promise<StudentAttendanceHistoryItemDto[]> {
    const userRecords = this.records.filter((r) => r.userId === userId);
    return userRecords.map((r) => ({
      id: r.sessionId,
      sessionId: r.sessionId,
      sessionTitle: `Session ${r.sessionId}`,
      sessionStatus: 'open',
      openAt: new Date().toISOString(),
      closeAt: new Date(Date.now() + 3600000).toISOString(),
      radius: 50,
      sessionLatitude: 11.9404,
      sessionLongitude: 108.4583,
      status: r.status,
      checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
      deviceId: r.deviceId,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      distanceMeters: r.distanceMeters,
    }));
  }
}
