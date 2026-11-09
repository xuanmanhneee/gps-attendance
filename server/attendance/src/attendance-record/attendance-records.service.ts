import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import {
  AttendanceHistoryEventDto,
  AttendanceCheckInErrorCode,
  AttendanceRecordErrorCode,
  StudentAttendanceHistoryItemDto,
  StudentAttendanceSummary,
} from '@gps-attendance/shared';
import { AttendanceRecord, MarkPresentInput } from './attendance-record.model';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import {
  CreateAttendanceHistoryEventInput,
  IAttendanceRecordRepository,
} from './attendance-record.repository';
import { ATTENDANCE_RECORD_REPOSITORY } from './attendance-record.token';
import { ATTENDANCE_RECORD_BUFFER } from './attendance-record.token';
import { IAttendanceRecordBuffer } from './attendance-record.buffer';
import { JOB_SCHEDULER } from '../job-scheduler/job-scheduler.token';
import { IJobScheduler } from '../job-scheduler/job-scheduler.interface';

@Injectable()
export class AttendanceRecordsService implements OnModuleInit {
  private readonly logger: ILogger;
  constructor(
    @Inject(ATTENDANCE_RECORD_REPOSITORY)
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
    @Inject(ATTENDANCE_RECORD_BUFFER)
    private readonly attendanceRecordBuffer: IAttendanceRecordBuffer,
    @Inject(JOB_SCHEDULER)
    private readonly jobScheduler: IJobScheduler,
  ) {
    this.logger = loggerFactory.create(AttendanceRecordsService.name);
  }

  onModuleInit(): void {
    this.jobScheduler.onJob<{ sessionId: number }>(
      'attendance-session.flush',
      ({ sessionId }) => this.flushSession(sessionId),
    );
  }

  async initializeBufferForSession(
    sessionId: number,
    userIds: number[],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.attendanceRecordBuffer.insertRecordIfAbsent({
        sessionId,
        userId,
        status: 'absent',
        deviceId: null,
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        distanceMeters: null,
        updateBy: null,
      });
    }
  }

  async flushSession(sessionId: number): Promise<void> {
    const bufferedRecords =
      await this.attendanceRecordBuffer.beginSessionFlush(sessionId);
    const persistedRecords =
      await this.attendanceRecordRepository.findBySession(sessionId);
    const recordsByUser = new Map(
      persistedRecords.map((record) => [record.userId, record]),
    );

    for (const buffered of bufferedRecords) {
      const persisted = recordsByUser.get(buffered.userId);
      if (!persisted || buffered.updatedAt >= persisted.updatedAt) {
        recordsByUser.set(buffered.userId, buffered);
      }
    }

    await this.attendanceRecordRepository.upsertRecords(
      [...recordsByUser.values()].map(({ updatedAt: _updatedAt, ...record }) => record),
    );
    await this.attendanceRecordBuffer.completeSessionFlush(sessionId);
  }

  // Tạo sẵn record 'absent' cho toàn bộ eligible user của 1 session.
  // Gọi bởi AttendanceSessionsService lúc tạo session — đây là điểm duy nhất
  // domain Session được phép chạm vào dữ liệu Record, và phải đi qua service này,
  // không được gọi thẳng attendanceRecordStore.
  async initializeForSession(
    sessionId: number,
    userIds: number[],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.attendanceRecordRepository.upsertRecord({
        sessionId,
        userId,
        status: 'absent',
        deviceId: null,
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        distanceMeters: null,
        updateBy: null,
      });
      await this.attendanceRecordRepository.createHistoryEvent({
        sessionId,
        userId,
        eventType: 'SESSION_ASSIGNED',
        status: 'absent',
        note: 'Được phân vào phiên điểm danh',
      });
    }
  }

  async markPresent(input: MarkPresentInput): Promise<void> {
    if (!input.deviceId) {
      throw new BadRequestException({
        code: AttendanceCheckInErrorCode.MISSING_DEVICE_ID,
        message: 'Thiếu mã thiết bị để ghi nhận điểm danh',
      });
    }

    const result =
      await this.attendanceRecordBuffer.tryMarkPresentAndClaimDevice(
        input,
        input.deviceId,
        86_400,
      );
    if (result !== 'present' && result !== 'review') {
      throw new ConflictException({
        code: AttendanceRecordErrorCode.WRITE_CONFLICT,
        message: `Không thể ghi nhận điểm danh: ${result}`,
      });
    }

  }

  async getBySessionAndUser(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    const buffered = await this.attendanceRecordBuffer.getRecord(
      sessionId,
      userId,
    );
    if (buffered) return buffered;

    return this.attendanceRecordRepository.getRecord(sessionId, userId);
  }

  async findBySessionId(sessionId: number): Promise<AttendanceRecord[]> {
    return this.mergeRecords(
      await this.attendanceRecordRepository.findBySession(sessionId),
      await this.attendanceRecordBuffer.findBySession(sessionId),
    );
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    return this.mergeRecords(
      await this.attendanceRecordRepository.findByUser(userId),
      await this.attendanceRecordBuffer.findByUser(userId),
    );
  }

  async findDetailedHistoryByUser(
    userId: number,
  ): Promise<StudentAttendanceHistoryItemDto[]> {
    const [history, bufferedRecords, persistedRecords] = await Promise.all([
      this.attendanceRecordRepository.findDetailedHistoryByUser(userId),
      this.attendanceRecordBuffer.findByUser(userId),
      this.attendanceRecordRepository.findByUser(userId),
    ]);
    const bufferedBySession = new Map(
      bufferedRecords.map((record) => [record.sessionId, record]),
    );
    const persistedBySession = new Map(
      persistedRecords.map((record) => [record.sessionId, record]),
    );
    return history.map((item) => {
      const buffered = bufferedBySession.get(item.sessionId);
      const persisted = persistedBySession.get(item.sessionId);
      return buffered && (!persisted || buffered.updatedAt >= persisted.updatedAt)
        ? {
            ...item,
            status: buffered.status,
            checkedInAt: buffered.checkedInAt?.toISOString() ?? null,
            deviceId: buffered.deviceId,
            latitude: buffered.latitude,
            longitude: buffered.longitude,
            accuracy: buffered.accuracy,
            distanceMeters: buffered.distanceMeters,
          }
        : item;
    });
  }

  async createHistoryEvent(
    event: CreateAttendanceHistoryEventInput,
  ): Promise<void> {
    await this.attendanceRecordRepository.createHistoryEvent(event);
  }

  async findHistoryEventsByUser(
    userId: number,
  ): Promise<AttendanceHistoryEventDto[]> {
    return this.attendanceRecordRepository.findHistoryEventsByUser(userId);
  }

  async getMySummary(userId: number): Promise<StudentAttendanceSummary> {
    const history = await this.findDetailedHistoryByUser(userId);

    const totalSessions = history.length;
    const presentCount = history.filter((item) => item.status === 'present')
      .length;
    const lateCount = history.filter((item) => item.status === 'late').length;
    const absentCount = history.filter(
      (item) => item.status === 'absent' && item.sessionStatus === 'closed',
    ).length;
    const excusedCount = history.filter((item) => item.status === 'excused')
      .length;
    const completedSessions = history.filter(
      (item) => item.sessionStatus === 'closed',
    );
    const attendedCount = completedSessions.filter(
      (item) =>
        item.status === 'present' ||
        item.status === 'late' ||
        item.status === 'excused',
    ).length;
    const attendanceRate =
      completedSessions.length === 0
        ? 0
        : Math.round((attendedCount / completedSessions.length) * 100);
    const upcomingSessions = history.filter(
      (item) => item.sessionStatus === 'open' || item.sessionStatus === 'pending',
    ).length;
    const needsAttentionCount = absentCount + lateCount;

    return {
      totalSessions,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
      upcomingSessions,
      needsAttentionCount,
    };
  }

  async findById(
    id: number,
  ): Promise<StudentAttendanceHistoryItemDto | null> {
    return this.attendanceRecordRepository.findById(id);
  }

  private mergeRecords(
    persisted: AttendanceRecord[],
    buffered: AttendanceRecord[],
  ): AttendanceRecord[] {
    const byKey = new Map(
      persisted.map((record) => [
        `${record.sessionId}:${record.userId}`,
        record,
      ]),
    );
    for (const record of buffered) {
      const key = `${record.sessionId}:${record.userId}`;
      const current = byKey.get(key);
      if (!current || record.updatedAt >= current.updatedAt) {
        byKey.set(key, record);
      }
    }
    return [...byKey.values()].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    );
  }
}
