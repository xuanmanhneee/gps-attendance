import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { AttendanceValidationService } from '../attendance-validation/attendance-validation.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import {
  AttendanceCheckInErrorCode,
  AttendanceCheckInResult,
  AttendanceSessionErrorCode,
} from '@gps-attendance/shared';

import { AttemptCheck } from './checks/attempt.check';
import { DeviceCheck } from './checks/device.check';
import { ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY } from './attendance-check-in.token';
import { IAttendanceCheckInDeviceUsageRepository } from './repositories/attendance-check-in-device-usage.repository';
import { ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY } from './attendance-check-in.token';
import type { IAttendanceCheckInAttemptRepository } from './repositories/attendance-check-in-attempt.repository';

@Injectable()
export class AttendanceCheckInService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly attemptCheck: AttemptCheck,
    private readonly deviceCheck: DeviceCheck,
    @Inject(ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY)
    private readonly deviceUsageRepository: IAttendanceCheckInDeviceUsageRepository,
    @Inject(ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: IAttendanceCheckInAttemptRepository,
  ) {}

  async checkIn(
    dto: CheckInRequestDto,
    userId: number,
  ): Promise<AttendanceCheckInResult> {
    // -------------------------------------------------------------------------
    // 1. Guard layer: kiểm tra phiên điểm danh
    // -------------------------------------------------------------------------

    const session = await this.attendanceSessionsService.findById(
      dto.sessionId,
    );

    if (!session) {
      throw new NotFoundException({
        code: AttendanceSessionErrorCode.NOT_FOUND,
        message: 'Phiên điểm danh không tồn tại',
      });
    }

    const now = new Date();
    if (session.status !== 'open' || now < session.openAt || now > session.closeAt) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.SESSION_NOT_OPEN,
        message: 'Phiên điểm danh hiện không mở hoặc đã hết thời gian điểm danh',
      });
    }

    const distanceToCenter = this.attendanceValidationService.distanceToCenter(
      session,
      dto.location,
    );
    const attempt = await this.attemptCheck.evaluate({
      sessionId: dto.sessionId,
      userId,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      accuracy: dto.location.accuracy,
      distanceToCenter,
      deviceId: dto.device.deviceId,
      isMockLocation: dto.location.isMockLocation,
    });

    let existingRecord =
      await this.attendanceRecordsService.getBySessionAndUser(
        dto.sessionId,
        userId,
      );

    if (!existingRecord) {
      await this.attemptRepository.completeAttempt(
        attempt.attemptId,
        'REJECTED',
        ['USER_NOT_IN_SESSION'],
      );
      throw new BadRequestException({
        code: AttendanceCheckInErrorCode.USER_NOT_IN_SESSION,
        message: 'Sinh viên chưa được phân bổ vào phiên điểm danh này',
      });
    }

    if (existingRecord.status === 'present') {
      await this.attemptRepository.completeAttempt(
        attempt.attemptId,
        'REJECTED',
        ['ALREADY_CHECKED_IN'],
      );
      throw new ConflictException({
        code: AttendanceCheckInErrorCode.ALREADY_CHECKED_IN,
        message: 'Bạn đã điểm danh phiên học này rồi',
      });
    }

    // -------------------------------------------------------------------------
    // 2. Anti-fraud check: tần suất & trùng thiết bị
    // -------------------------------------------------------------------------
    if (attempt.isTooMany) {
      await this.attemptRepository.completeAttempt(
        attempt.attemptId,
        'REJECTED',
        ['TOO_MANY_ATTEMPTS'],
      );
      return {
        status: 'REJECTED',
        reasons: ['TOO_MANY_ATTEMPTS'],
      };
    }

    const device = await this.deviceCheck.evaluate({
      sessionId: dto.sessionId,
      deviceId: dto.device.deviceId,
      userId,
    });

    if (device.isDuplicate) {
      await this.attemptRepository.completeAttempt(
        attempt.attemptId,
        'REJECTED',
        ['DUPLICATE_DEVICE'],
      );
      return {
        status: 'REJECTED',
        reasons: ['DUPLICATE_DEVICE'],
      };
    }

    // -------------------------------------------------------------------------
    // 3. Validation layer: kiểm tra định vị & chấm điểm tin cậy
    // -------------------------------------------------------------------------
    const checkedInAt = new Date();
    const existingRecordCount = 0;

    const validation = this.attendanceValidationService.validate({
      session,
      userId,
      existingRecordCount,
      checkedInAt,
      location: dto.location,
      device: dto.device,
      integrity: dto.integrity,
    });

    if (validation.status === 'REJECTED') {
      await this.attemptRepository.completeAttempt(
        attempt.attemptId,
        'REJECTED',
        validation.reasons,
      );
      return {
        status: 'REJECTED',
        reasons: validation.reasons as [
          any,
          ...any[],
        ],
      };
    }

    // Ghi nhận điểm danh thành công (VALID hoặc REVIEW)
    await this.attendanceRecordsService.markPresent({
      sessionId: dto.sessionId,
      userId,
      checkedInAt,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      accuracy: dto.location.accuracy,
      deviceId: dto.device.deviceId,
      distanceMeters: validation.distance,
      updateBy: userId,
    });

    // Đánh dấu thiết bị đã được dùng cho session này
    await this.deviceUsageRepository.markUsed(
      dto.sessionId,
      dto.device.deviceId,
    );

    await this.attemptRepository.completeAttempt(
      attempt.attemptId,
      validation.status === 'VALID' ? 'APPROVED' : 'REVIEW',
      validation.reasons,
    );

    if (validation.status === 'VALID') {
      return {
        status: 'VALID',
      };
    }

    return {
      status: 'REVIEW',
      reasons: validation.reasons as [
        any,
        ...any[],
      ],
    };
  }
}
