import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  AttendanceReviewDecision,
  AttendanceReviewErrorCode,
  AttendanceReviewCandidateResponse,
  AttendanceSessionErrorCode,
  AuditAction,
  AuditEntityType,
  CheckInResponse,
} from '@gps-attendance/shared';

import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { AttendanceValidationService } from '../attendance-validation/attendance-validation.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import type { ILoggerFactory } from '../common/logging/logger.factory';
import type { ILogger } from '../common/logging/logger.interface';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { AttemptCheck } from './checks/attempt.check';
import { REVIEW_RESOLUTION_WINDOW_MS } from '../attendance-record/attendance-review.constants';

@Injectable()
export class AttendanceCheckInService {
  private readonly logger: ILogger;

  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly attemptCheck: AttemptCheck,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    @Inject(LOGGER_FACTORY) loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(AttendanceCheckInService.name);
  }

  async checkIn(
    dto: CheckInRequestDto,
    userId: number,
  ): Promise<CheckInResponse> {
    const checkedInAt = new Date();
    const session = await this.attendanceSessionsService.findById(
      dto.sessionId,
    );

    if (session.status !== 'open') {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Phiên điểm danh hiện không mở',
      });
    }

    const record = await this.attendanceRecordsService.getBySessionAndUser(
      dto.sessionId,
      userId,
    );
    if (!record) {
      throw new BadRequestException({
        code: AttendanceReviewErrorCode.USER_NOT_IN_SESSION,
        message: 'User không thuộc session này',
      });
    }
    if (record.status === 'present') {
      throw new ConflictException({
        code: AttendanceReviewErrorCode.ALREADY_CHECKED_IN,
        message: 'Đã điểm danh rồi',
      });
    }
    if (record.updateBy !== null) {
      throw new ConflictException({
        code: AttendanceReviewErrorCode.RECORD_LOCKED,
        message: 'Kết quả điểm danh đã được giảng viên chốt',
      });
    }

    const attempt = await this.attemptCheck.evaluate({
      sessionId: dto.sessionId,
      userId,
    });
    if (attempt.isTooMany) {
      return { status: 'REJECTED', reasons: ['TOO_MANY_ATTEMPTS'] };
    }

    const cooldownAccepted = await this.redisService.set(
      `attendance:cooldown:${dto.sessionId}:${userId}`,
      '1',
      { ttlSec: 10, ifNotExists: true },
    );
    if (cooldownAccepted === null) {
      throw new HttpException(
        {
          code: AttendanceReviewErrorCode.COOLDOWN,
          message: 'Vui lòng thử lại sau vài giây',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const validation = this.attendanceValidationService.validate({
      session,
      userId,
      checkedInAt,
      location: dto.location,
      device: dto.device,
      integrity: dto.integrity,
    });
    if (validation.status === 'REJECTED') {
      return { status: 'REJECTED', reasons: validation.reasons };
    }

    const deviceTtlSeconds = Math.max(
      3600,
      Math.ceil((session.closeAt.getTime() - Date.now()) / 1000) + 600,
    );
    const commit = await this.attendanceRecordsService.markPresent(
      {
        sessionId: dto.sessionId,
        userId,
        checkedInAt,
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
        accuracy: dto.location.accuracy,
        updateBy: userId,
        validationStatus: validation.status,
        ...(validation.status === 'REVIEW'
          ? { reasons: validation.reasons }
          : {}),
      },
      dto.device.deviceId,
      deviceTtlSeconds,
    );

    if (commit === 'device-used') {
      return { status: 'REJECTED', reasons: ['DUPLICATE_DEVICE'] };
    }
    if (commit === 'already-present') {
      throw new ConflictException({
        code: AttendanceReviewErrorCode.ALREADY_CHECKED_IN,
        message: 'Đã điểm danh rồi',
      });
    }
    if (commit === 'record-missing') {
      throw new BadRequestException({
        code: AttendanceReviewErrorCode.USER_NOT_IN_SESSION,
        message: 'User không thuộc session này',
      });
    }
    if (commit === 'locked') {
      throw new ConflictException({
        code: AttendanceReviewErrorCode.RECORD_LOCKED,
        message: 'Kết quả điểm danh đã được giảng viên chốt',
      });
    }
    if (commit === 'session-flushing') {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Phiên điểm danh đã đóng',
      });
    }

    return validation.status === 'VALID'
      ? { status: 'VALID' }
      : { status: 'REVIEW', reasons: validation.reasons };
  }

  async listReviewCandidates(
    sessionId: number,
    lecturerId: number,
  ): Promise<AttendanceReviewCandidateResponse[]> {
    const session = await this.assertReviewOwner(sessionId, lecturerId);
    if (session.status === 'cancelled') {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Phiên điểm danh đã bị huỷ',
      });
    }

    const records =
      await this.attendanceRecordsService.findReviewCandidatesBySession(
        sessionId,
      );
    const users = await this.usersService.findByIds(
      records.map((r) => r.userId),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));

    return records.flatMap((record) => {
      const student = usersById.get(record.userId);
      if (!student) return [];
      return [
        {
          sessionId,
          userId: record.userId,
          student: {
            code: student.code,
            role: student.role,
            fullname: student.fullname,
          },
          reasons: record.reasons,
        },
      ];
    });
  }

  async resolveReview(
    sessionId: number,
    userId: number,
    decision: AttendanceReviewDecision,
    resolverId: number,
    reason?: string,
  ): Promise<void> {
    const session = await this.assertReviewOwner(sessionId, resolverId);
    const now = Date.now();
    if (
      session.status === 'cancelled' ||
      now < session.openAt.getTime() ||
      now > session.closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS
    ) {
      throw new BadRequestException({
        code: AttendanceReviewErrorCode.RESOLUTION_WINDOW_CLOSED,
        message: 'Đã ngoài thời gian chốt yêu cầu review',
      });
    }

    const result = await this.attendanceRecordsService.resolveReview(
      sessionId,
      userId,
      decision,
      resolverId,
    );
    if (result.status !== 'resolved') {
      this.throwForReviewMutationFailure(result.status);
      return;
    }

    const entry = {
      entityType: AuditEntityType.ATTENDANCE_RECORD,
      entityId: `${sessionId}:${userId}`,
      action: AuditAction.REVIEW_RESOLVED,
      actorId: resolverId,
      reason,
      oldValue: { status: result.previousStatus },
      newValue: { status: result.record.status },
      metadata: {
        reasons: result.candidate.reasons,
      },
    };

    try {
      await this.auditLogService.record(entry);
    } catch (error) {
      // Redis là quyết định thật và không có transaction chung với Postgres.
      // Không hoàn tác quyết định; log đủ entry để có thể truy ngược thủ công.
      this.logger.error(
        `Ghi audit review thất bại: ${JSON.stringify(entry)}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async assertReviewOwner(sessionId: number, userId: number) {
    const session = await this.attendanceSessionsService.findById(sessionId);
    if (session.createdBy !== userId) {
      throw new ForbiddenException({
        code: AttendanceSessionErrorCode.FORBIDDEN,
        message: 'Chỉ người tạo phiên mới được xử lý review',
      });
    }
    return session;
  }

  private throwForReviewMutationFailure(
    result:
      | 'record-missing'
      | 'locked'
      | 'not-requested'
      | 'session-flushing',
  ): void {
    if (result === 'locked') {
      throw new ConflictException({
        code: AttendanceReviewErrorCode.RECORD_LOCKED,
        message: 'Kết quả điểm danh đã được chốt',
      });
    }
    if (result === 'record-missing') {
      throw new BadRequestException({
        code: AttendanceReviewErrorCode.USER_NOT_IN_SESSION,
        message: 'Không có record điểm danh trong phiên',
      });
    }
    if (result === 'session-flushing') {
      throw new ConflictException({
        code: AttendanceReviewErrorCode.RESOLUTION_WINDOW_CLOSED,
        message: 'Phiên điểm danh đang được chốt',
      });
    }
    throw new BadRequestException({
      code: AttendanceReviewErrorCode.CANDIDATE_NOT_FOUND,
      message: 'Không tìm thấy review candidate',
    });
  }
}
