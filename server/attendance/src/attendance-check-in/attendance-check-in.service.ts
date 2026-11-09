import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  AttendanceReviewDecision,
  AttendanceReviewErrorCode,
  AttendanceReviewCandidateResponse,
  AttendanceReviewHistoryResponse,
  AttendanceSessionErrorCode,
  CheckInResponse,
} from '@gps-attendance/shared';

import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { AttendanceValidationService } from '../attendance-validation/attendance-validation.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UsersService } from '../users/users.service';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import type { ILoggerFactory } from '../common/logging/logger.factory';
import type { ILogger } from '../common/logging/logger.interface';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { AttemptCheck } from './checks/attempt.check';
import { AttendanceReviewService } from '../attendance-review/attendance-review.service';
import { REVIEW_RESOLUTION_WINDOW_MS } from '../attendance-review/attendance-review.constants';

@Injectable()
export class AttendanceCheckInService {
  private readonly logger: ILogger;

  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly attendanceReviewService: AttendanceReviewService,
    private readonly attemptCheck: AttemptCheck,
    private readonly usersService: UsersService,
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

    const validation = await this.attendanceValidationService.validate({
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

    if (validation.status === 'REVIEW') {
      const reviewResult = await this.attendanceReviewService.requestReview({
        sessionId: dto.sessionId,
        userId,
        reasons: validation.reasons,
        createdAt: checkedInAt,
        expiresAt: new Date(
          session.closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS,
        ),
      });

      if (reviewResult === 'already-present') {
        throw new ConflictException({
          code: AttendanceReviewErrorCode.ALREADY_CHECKED_IN,
          message: 'Đã điểm danh rồi',
        });
      }
      if (reviewResult === 'record-missing') {
        throw new BadRequestException({
          code: AttendanceReviewErrorCode.USER_NOT_IN_SESSION,
          message: 'User không thuộc session này',
        });
      }
      if (reviewResult === 'locked') {
        throw new ConflictException({
          code: AttendanceReviewErrorCode.RECORD_LOCKED,
          message: 'Kết quả điểm danh đã được giảng viên chốt',
        });
      }

      return { status: 'REVIEW', reasons: validation.reasons };
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

    try {
      await this.attendanceReviewService.removeCandidate(dto.sessionId, userId);
    } catch (error) {
      // Điểm danh VALID đã commit; không báo thất bại giả nếu cleanup candidate
      // tạm lỗi. Candidate có TTL và record đã khóa nên không thể được duyệt lại.
      this.logger.error(
        `Xoá review candidate sau VALID thất bại: sessionId=${dto.sessionId}, userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return { status: 'VALID' };
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

    const records = await this.attendanceReviewService.findBySession(sessionId);
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

  async listReviewHistory(
    resolverId: number,
  ): Promise<AttendanceReviewHistoryResponse[]> {
    const history =
      await this.attendanceReviewService.findHistoryByResolver(resolverId);

    const [sessions, users] = await Promise.all([
      this.attendanceSessionsService.findByIds([
        ...new Set(history.map((item) => item.sessionId)),
      ]),
      this.usersService.findByIds([
        ...new Set(history.map((item) => item.userId)),
      ]),
    ]);
    const sessionsById = new Map(sessions.map((item) => [item.id, item]));
    const usersById = new Map(users.map((item) => [item.id, item]));

    return history.flatMap((item) => {
      const { sessionId, userId } = item;
      const session = sessionsById.get(sessionId);
      const student = usersById.get(userId);

      // Kiểm tra owner lần nữa để không trả audit cũ nếu dữ liệu lịch sử sai.
      if (!session || session.createdBy !== resolverId || !student) return [];

      return [
        {
          id: item.id,
          session: { id: session.id, title: session.title },
          student: {
            code: student.code,
            role: student.role,
            fullname: student.fullname,
          },
          decision: item.decision,
          reasons: item.reasons,
          reason: item.reason ?? null,
          resolvedAt: item.resolvedAt.toISOString(),
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

    const result = await this.attendanceReviewService.resolveReview(
      sessionId,
      userId,
      decision,
      resolverId,
    );
    if (result.status !== 'resolved') {
      this.throwForReviewMutationFailure(result.status);
      return;
    }

    const historyEntry = {
      sessionId,
      userId,
      resolverId,
      decision,
      reasons: result.candidate.reasons,
      reason,
      previousStatus: result.previousStatus,
      resolvedStatus: result.record.status,
    };

    try {
      await this.attendanceReviewService.recordHistory(historyEntry);
    } catch (error) {
      // Redis là quyết định thật và không có transaction chung với Postgres.
      // Không hoàn tác quyết định; log đủ entry để có thể truy ngược thủ công.
      this.logger.error(
        `Ghi history review thất bại: ${JSON.stringify(historyEntry)}`,
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
    result: 'record-missing' | 'locked' | 'not-requested' | 'session-flushing',
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
