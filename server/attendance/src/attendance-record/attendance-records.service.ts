import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  AttendanceHistoryEventDto,
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

@Injectable()
export class AttendanceRecordsService {
  private readonly logger: ILogger;
  constructor(
    @Inject(ATTENDANCE_RECORD_REPOSITORY)
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(AttendanceRecordsService.name);
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

  async markPresent(input: MarkPresentInput): Promise<AttendanceRecord> {
    await this.attendanceRecordRepository.upsertRecord({
      sessionId: input.sessionId,
      userId: input.userId,
      status: 'present',
      deviceId: input.deviceId ?? null,
      checkedInAt: input.checkedInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      distanceMeters: input.distanceMeters ?? null,
      updateBy: input.updateBy,
    });

    return this.attendanceRecordRepository.getRecord(
      input.sessionId,
      input.userId,
    ) as Promise<AttendanceRecord>;
  }

  async getBySessionAndUser(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    return this.attendanceRecordRepository.getRecord(sessionId, userId);
  }

  async findBySessionId(sessionId: number): Promise<AttendanceRecord[]> {
    return this.attendanceRecordRepository.findBySession(sessionId);
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    return this.attendanceRecordRepository.findByUser(userId);
  }

  async findDetailedHistoryByUser(
    userId: number,
  ): Promise<StudentAttendanceHistoryItemDto[]> {
    return this.attendanceRecordRepository.findDetailedHistoryByUser(userId);
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
}

