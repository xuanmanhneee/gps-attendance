import { Inject, Injectable } from '@nestjs/common';

import { AttendanceRecord, MarkPresentInput } from './attendance-record.model';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { IAttendanceRecordRepository } from './attendance-record.repository';
import {
  ATTENDANCE_RECORD_BUFFER,
  ATTENDANCE_RECORD_REPOSITORY,
} from './attendance-record.token';
import {
  IAttendanceRecordBuffer,
  MarkPresentResult,
} from './attendance-record.buffer';
import { RedisService } from '../redis/redis.service';
import { rosterInitializedKeyFor } from '../attendance-sessions/attendance-session-keys';

@Injectable()
export class AttendanceRecordsService {
  private readonly logger: ILogger;
  constructor(
    @Inject(ATTENDANCE_RECORD_REPOSITORY)
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,

    @Inject(ATTENDANCE_RECORD_BUFFER)
    private readonly attendanceRecordBuffer: IAttendanceRecordBuffer,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
    private readonly redisService: RedisService,
  ) {
    this.logger = loggerFactory.create(AttendanceRecordsService.name);
  }

  // Đẩy toàn bộ record của 1 session từ buffer (Redis) xuống Postgres,
  // rồi xoá buffer. Gọi bởi job 'attendance:flush' lúc session đóng.
  // beginSessionFlush chặn ghi mới và lấy snapshot nguyên tử: check-in hoặc
  // được đưa vào snapshot, hoặc bị từ chối trước khi server trả VALID.
  // Chỉ complete sau bulkUpsert để nếu Postgres lỗi, buffer vẫn còn cho job retry.
  async flushSessionToDb(sessionId: number): Promise<void> {
    const records =
      await this.attendanceRecordBuffer.beginSessionFlush(sessionId);

    if (records.length === 0) {
      await this.attendanceRecordBuffer.completeSessionFlush(sessionId);
      this.logger.warn(
        `Flush session ${sessionId}: không có record nào trong buffer`,
      );
      return;
    }

    await this.attendanceRecordRepository.bulkUpsert(records);
    await this.attendanceRecordBuffer.completeSessionFlush(sessionId);

    this.logger.log(
      `Flushed ${records.length} record(s) xuống DB cho session ${sessionId}`,
    );
  }

  // Xoá toàn bộ record trong buffer của 1 session — dùng khi session bị huỷ
  // giữa lúc đang mở, để tránh dữ liệu check-in dở dang bị lẫn vào lần flush
  // kế nếu job flush trót chạy trước khi bị cancel kịp.
  async clearSessionBuffer(sessionId: number): Promise<void> {
    await this.attendanceRecordBuffer.clearSession(sessionId);
    await this.redisService.del(rosterInitializedKeyFor(sessionId));
    this.logger.warn(
      `Đã xoá buffer của session ${sessionId} do session bị huỷ`,
    );
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
      await this.attendanceRecordBuffer.insertRecordIfAbsent({
        sessionId,
        userId,
        status: 'absent',
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        updateBy: null,
      });

      this.logger.log(
        `Attendance record ensured: sessionId=${sessionId}, userId=${userId}, status=absent`,
      );
    }
  }

  async markPresent(
    input: MarkPresentInput,
    deviceId: string,
    deviceTtlSeconds: number,
  ): Promise<MarkPresentResult> {
    return this.attendanceRecordBuffer.tryMarkPresentAndClaimDevice(
      input,
      deviceId,
      deviceTtlSeconds,
    );
  }

  resolveReviewRecord(
    sessionId: number,
    userId: number,
    decision: 'approve' | 'reject',
    resolverId: number,
    candidateCreatedAt: Date,
  ) {
    return this.attendanceRecordBuffer.resolveReviewRecord(
      sessionId,
      userId,
      decision,
      resolverId,
      candidateCreatedAt,
    );
  }

  // Đọc buffer trước (dữ liệu mới nhất khi session đang mở), fallback sang
  // repository (Postgres) nếu buffer rỗng — trường hợp session đã đóng và
  // được flush, dữ liệu lúc này chỉ còn ở Postgres.
  async getBySessionAndUser(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    const buffered = await this.attendanceRecordBuffer.getRecord(
      sessionId,
      userId,
    );
    return (
      buffered ?? this.attendanceRecordRepository.getRecord(sessionId, userId)
    );
  }

  async findBySessionId(sessionId: number): Promise<AttendanceRecord[]> {
    const buffered = await this.attendanceRecordBuffer.findBySession(sessionId);
    return buffered.length > 0
      ? buffered
      : this.attendanceRecordRepository.findBySession(sessionId);
  }

  // Khác 2 hàm trên: 1 user có thể có record vừa ở session đang mở (buffer)
  // vừa ở session đã đóng (repository) CÙNG LÚC — cần gộp cả 2, không phải
  // fallback đơn thuần.
  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    const [buffered, persisted] = await Promise.all([
      this.attendanceRecordBuffer.findByUser(userId),
      this.attendanceRecordRepository.findByUser(userId),
    ]);

    const bufferedSessionIds = new Set(buffered.map((r) => r.sessionId));
    const persistedOnly = persisted.filter(
      (r) => !bufferedSessionIds.has(r.sessionId),
    );

    return [...buffered, ...persistedOnly];
  }
}
