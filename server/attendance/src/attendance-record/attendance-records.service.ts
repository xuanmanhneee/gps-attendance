import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';

import { AttendanceRecord, MarkPresentInput } from './attendance-record.model';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { IAttendanceRecordRepository } from './attendance-record.repository';
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
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        updateBy: null,
      });
    }
  }

  async markPresent(input: MarkPresentInput): Promise<AttendanceRecord> {
    await this.attendanceRecordRepository.upsertRecord({
      sessionId: input.sessionId,
      userId: input.userId,
      status: 'present',
      checkedInAt: input.checkedInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
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
}
