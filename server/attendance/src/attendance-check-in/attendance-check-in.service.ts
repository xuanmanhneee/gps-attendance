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
  AttendanceSessionErrorCode,
  AttendanceCheckInResult,
} from '@gps-attendance/shared';
import { AttemptCheck } from './checks/attempt.check';
import { DeviceCheck } from './checks/device.check';

@Injectable()
export class AttendanceCheckInService {
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly attendanceRecordsService: AttendanceRecordsService,

    private readonly attemptCheck: AttemptCheck,
    private readonly deviceCheck: DeviceCheck,
  ) {}

  async checkIn(
    dto: CheckInRequestDto,
    userId: number,
  ): Promise<AttendanceCheckInResult> {
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

    const device = await this.deviceCheck.evaluate({
      sessionId: dto.sessionId,
      deviceId: dto.device.deviceId,
    });

    if (device.isDuplicate) {
      return {
        status: 'REJECTED',
        reasons: ['DUPLICATE_DEVICE'],
      };
    }

    // --- Validation layer ---
    const checkedInAt = new Date();

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

    await this.attendanceRecordsService.markPresent({
      sessionId: dto.sessionId,
      userId,
      checkedInAt,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      accuracy: dto.location.accuracy,
      updateBy: userId
    });

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
