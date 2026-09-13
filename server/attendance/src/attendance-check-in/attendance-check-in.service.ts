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

    if (session.status !== 'open') {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.SESSION_NOT_OPEN,
        message: 'Phiên điểm danh hiện không mở',
      });
    }

    let existingRecord =
      await this.attendanceRecordsService.getBySessionAndUser(
        dto.sessionId,
        userId,
      );

    if (!existingRecord) {
      // Tự động phân bổ sinh viên vào phiên mở nếu chưa được phân bổ trước đó
      await this.attendanceRecordsService.initializeForSession(dto.sessionId, [
        userId,
      ]);
      existingRecord = await this.attendanceRecordsService.getBySessionAndUser(
        dto.sessionId,
        userId,
      );
    }

    if (!existingRecord) {
      throw new BadRequestException({
        code: AttendanceCheckInErrorCode.USER_NOT_IN_SESSION,
        message: 'Sinh viên chưa được phân bổ vào phiên điểm danh này',
      });
    }

    if (existingRecord.status === 'present') {
      throw new ConflictException({
        code: AttendanceCheckInErrorCode.ALREADY_CHECKED_IN,
        message: 'Bạn đã điểm danh phiên học này rồi',
      });
    }

    // -------------------------------------------------------------------------
    // 2. Anti-fraud check: tần suất & trùng thiết bị
    // -------------------------------------------------------------------------
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
