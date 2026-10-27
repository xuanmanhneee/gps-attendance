import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { AttendanceValidationService } from '../attendance-validation/attendance-validation.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';

import { CheckInRequestDto } from './attendance-check-in.dto';

import {
  CheckInResponse,
  AttendanceSessionErrorCode,
} from '@gps-attendance/shared';
import { AttemptCheck } from './checks/attempt.check';

@Injectable()
export class AttendanceCheckInService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly attendanceRecordsService: AttendanceRecordsService,

    private readonly attemptCheck: AttemptCheck,
  ) {}

  async checkIn(
    dto: CheckInRequestDto,
    userId: number,
  ): Promise<CheckInResponse> {
    // Chốt thời điểm server nhận request trước mọi I/O để thời gian chờ DB/Redis
    // không bị tính nhầm vào độ tuổi của mẫu GPS.
    const checkedInAt = new Date();

    // --- Guard layer ---
    const session = await this.attendanceSessionsService.findById(
      dto.sessionId,
    );

    if (!session) {
      throw new NotFoundException({
        code: AttendanceSessionErrorCode.NOT_FOUND,
        message: 'Session không tồn tại',
      });
    }

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
        code: 'USER_NOT_IN_SESSION',
        message: 'User không thuộc session này',
      });
    }

    if (record.status === 'present') {
      throw new ConflictException({
        code: 'ALREADY_CHECKED_IN',
        message: 'Đã điểm danh rồi',
      });
    }

    // --- Check-in layer ---
    const attempt = await this.attemptCheck.evaluate({
      sessionId: dto.sessionId,
      userId,
    });

    if (attempt.isTooMany) {
      return {
        status: 'REJECTED',
        reasons: ['TOO_MANY_ATTEMPTS'],
      };
    }

    // --- Validation layer ---
    const validation = await this.attendanceValidationService.validate({
      session,
      userId,
      checkedInAt,
      location: dto.location,
      device: dto.device,
      integrity: dto.integrity,
    });

    if (validation.status === 'REJECTED') {
      return {
        status: 'REJECTED',
        reasons: validation.reasons,
      };
    }

    const deviceTtlSeconds = Math.max(
      3600,
      Math.ceil((session.closeAt.getTime() - Date.now()) / 1000) + 3600,
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
        code: 'ALREADY_CHECKED_IN',
        message: 'Đã điểm danh rồi',
      });
    }
    if (commit === 'record-missing') {
      throw new BadRequestException({
        code: 'USER_NOT_IN_SESSION',
        message: 'User không thuộc session này',
      });
    }
    if (commit === 'session-flushing') {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Phiên điểm danh đã đóng',
      });
    }

    if (validation.status === 'VALID') {
      return {
        status: 'VALID',
      };
    }

    return {
      status: 'REVIEW',
      reasons: validation.reasons,
    };
  }
}
