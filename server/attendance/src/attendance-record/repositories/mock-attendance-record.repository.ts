import { Injectable } from '@nestjs/common';
import {
  AttendanceHistoryEventDto,
  StudentAttendanceHistoryItemDto,
} from '@gps-attendance/shared';
import { AttendanceRecord } from '../attendance-record.model';
import {
  CreateAttendanceHistoryEventInput,
  IAttendanceRecordRepository,
} from '../attendance-record.repository';

@Injectable()
export class MockAttendanceRecordRepository
  implements IAttendanceRecordRepository
{
  private records: AttendanceRecord[] = [];
  private historyEvents: Array<{
    userId: number;
    event: AttendanceHistoryEventDto;
  }> = [];
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

  async upsertRecords(
    records: Omit<AttendanceRecord, 'updatedAt'>[],
  ): Promise<void> {
    await Promise.all(records.map((record) => this.upsertRecord(record)));
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    return this.records.filter((r) => r.userId === userId);
  }

  async findBySession(sessionId: number): Promise<AttendanceRecord[]> {
    return this.records.filter((r) => r.sessionId === sessionId);
  }

  async createHistoryEvent(
    event: CreateAttendanceHistoryEventInput,
  ): Promise<void> {
    this.historyEvents.unshift({
      userId: event.userId,
      event: {
        id: this.historyEvents.length + 1,
        sessionId: event.sessionId,
        sessionTitle: `Session ${event.sessionId}`,
        eventType: event.eventType,
        status: event.status ?? null,
        attemptResult: event.attemptResult ?? null,
        reasons: event.reasons ?? [],
        note: event.note ?? null,
        actorName: null,
        createdAt: new Date().toISOString(),
      },
    });
  }

  async findHistoryEventsByUser(
    userId: number,
  ): Promise<AttendanceHistoryEventDto[]> {
    return this.historyEvents
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.event);
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

  async findById(id: number): Promise<StudentAttendanceHistoryItemDto | null> {
    const list = await this.findDetailedHistoryByUser(1);
    return list.find((item) => item.id === id) ?? null;
  }
}
