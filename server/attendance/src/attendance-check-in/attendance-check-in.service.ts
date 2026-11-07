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
import { PrismaService } from '../common/database/prisma.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import {
  AttendanceCheckInErrorCode,
  AttendanceCheckInReason,
  AttendanceCheckInResult,
  AttendanceSessionErrorCode,
} from '@gps-attendance/shared';

import { AttemptCheck } from './checks/attempt.check';
import { DeviceCheck } from './checks/device.check';
import { ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY } from './attendance-check-in.token';
import { IAttendanceCheckInDeviceUsageRepository } from './repositories/attendance-check-in-device-usage.repository';
import { ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY } from './attendance-check-in.token';
import type { IAttendanceCheckInAttemptRepository } from './repositories/attendance-check-in-attempt.repository';
import { AuditLogService } from '../common/audit/audit-log.service';
import { DeviceAttestationService } from '../common/device-attestation/device-attestation.service';
import { MonitoringService } from '../health/monitoring.service';

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
    private readonly prisma: PrismaService,
    private readonly auditLogService?: AuditLogService,
    private readonly deviceAttestationService?: DeviceAttestationService,
    private readonly monitoringService?: MonitoringService,
  ) {}

  async checkIn(
    dto: CheckInRequestDto,
    userId: number,
  ): Promise<AttendanceCheckInResult> {
    const audit = this.auditLogService ?? { record: async () => {} };
    const attestationService = this.deviceAttestationService ?? new DeviceAttestationService();
    const monitoring = this.monitoringService ?? { recordCheckInOutcome: () => {} };

    // -------------------------------------------------------------------------
    // 1. Guard layer: kiểm tra phiên điểm danh
    // -------------------------------------------------------------------------

    const [session] = await Promise.all([
      this.attendanceSessionsService.findById(dto.sessionId),
      audit.record({
        actorUserId: userId,
        action: 'CHECK_IN_REQUESTED',
        entityType: 'attendance_session',
        entityId: String(dto.sessionId),
        metadata: {
          latitude: dto.location.latitude,
          longitude: dto.location.longitude,
          accuracy: dto.location.accuracy,
          deviceId: dto.device.deviceId,
        },
      }),
    ]);

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
    const [attempt, existingRecord] = await Promise.all([
      this.attemptCheck.evaluate({
        sessionId: dto.sessionId,
        userId,
        latitude: dto.location.latitude,
        longitude: dto.location.longitude,
        accuracy: dto.location.accuracy,
        distanceToCenter,
        deviceId: dto.device.deviceId,
        isMockLocation: dto.location.isMockLocation,
      }),
      this.attendanceRecordsService.getBySessionAndUser(dto.sessionId, userId),
    ]);

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

    const [registeredDevice, device] = await Promise.all([
      this.prisma.registeredDevice.upsert({
        where: {
          userId_deviceId: { userId, deviceId: dto.device.deviceId },
        },
        create: {
          userId,
          deviceId: dto.device.deviceId,
          platform: dto.device.platform,
          model: dto.device.model,
          trustStatus: 'UNVERIFIED',
        },
        update: {
          platform: dto.device.platform,
          model: dto.device.model,
          lastSeenAt: new Date(),
        },
        select: { id: true, trustStatus: true },
      }),
      this.deviceCheck.evaluate({
        sessionId: dto.sessionId,
        deviceId: dto.device.deviceId,
        userId,
      }),
    ]);

    const attestation = attestationService.verify(
      dto.device.platform,
      dto.integrity?.integrityToken,
    );

    const [latestLecturerVerification] = await Promise.all([
      this.prisma.lecturerLocationVerification?.findFirst?.({
        where: {
          sessionId: dto.sessionId,
          status: 'PASS',
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deviceIntegrityCheck.create({
        data: {
          userId,
          registeredDeviceId: registeredDevice.id,
          sessionId: dto.sessionId,
          provider: dto.device.platform === 'ios' ? 'APP_ATTEST' : 'PLAY_INTEGRITY',
          verdict: attestation.verdict,
          reasons: attestation.reasons.length > 0 ? attestation.reasons : ['ATTESTATION_OK'],
        },
      }),
    ]);

    if (!attestation.isValid) {
      await audit.record({
        actorUserId: userId,
        action: 'CHECK_IN_REVIEWED',
        entityType: 'attendance_check_in',
        entityId: String(dto.sessionId),
        metadata: {
          reason: 'DEVICE_ATTESTATION_FAILED',
          details: attestation.reasons,
        },
      });

      if (attestation.verdict === 'DEVICE_ROOTED' || attestation.verdict === 'EMULATOR_DETECTED') {
        await this.attemptRepository.completeAttempt(
          attempt.attemptId,
          'REJECTED',
          ['DEVICE_BLOCKED'],
        );
        return { status: 'REJECTED', reasons: ['DEVICE_BLOCKED'] };
      }
    }

    if (registeredDevice.trustStatus === 'BLOCKED') {
      await this.attemptRepository.completeAttempt(
        attempt.attemptId,
        'REJECTED',
        ['DEVICE_BLOCKED'],
      );
      return { status: 'REJECTED', reasons: ['DEVICE_BLOCKED'] };
    }

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

    // Truy vấn mốc vị trí xác thực gần nhất của giảng viên trong session (nếu có)
    const lecturerLocation = latestLecturerVerification
      ? {
          latitude: Number(latestLecturerVerification.latitude),
          longitude: Number(latestLecturerVerification.longitude),
          accuracy: Number(latestLecturerVerification.accuracy),
          verifiedAt: latestLecturerVerification.createdAt,
        }
      : null;

    const validation = this.attendanceValidationService.validate({
      session,
      userId,
      existingRecordCount,
      checkedInAt,
      location: dto.location,
      device: dto.device,
      integrity: dto.integrity,
      lecturerLocation,
    });

    const reasons: AttendanceCheckInReason[] = [...validation.reasons];
    const finalStatus: 'VALID' | 'REVIEW' =
      validation.status === 'VALID' &&
      registeredDevice.trustStatus !== 'UNVERIFIED'
        ? 'VALID'
        : 'REVIEW';
    if (registeredDevice.trustStatus === 'UNVERIFIED') {
      reasons.push('DEVICE_UNVERIFIED');
    }

    if (validation.status === 'REJECTED') {
      monitoring.recordCheckInOutcome('REJECTED');
      await Promise.all([
        this.attemptRepository.completeAttempt(
          attempt.attemptId,
          'REJECTED',
          reasons,
        ),
        audit.record({
          actorUserId: userId,
          action: 'CHECK_IN_REJECTED',
          entityType: 'attendance_check_in',
          entityId: String(dto.sessionId),
          metadata: {
            status: 'REJECTED',
            reasons,
            distanceMeters: validation.distance,
            distanceToLecturer: validation.distanceToLecturer,
            lecturerProximityVerdict: validation.lecturerProximityVerdict,
          },
        }),
      ]);
      return {
        status: 'REJECTED',
        reasons: reasons as [
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
      validationStatus: finalStatus,
      reasons,
    });

    // Đánh dấu thiết bị đã được dùng cho session này
    await this.deviceUsageRepository.markUsed(
      dto.sessionId,
      dto.device.deviceId,
    );

    monitoring.recordCheckInOutcome(
      finalStatus === 'VALID' ? 'VALID' : 'REVIEW',
    );
    await Promise.all([
      this.attemptRepository.completeAttempt(
        attempt.attemptId,
        finalStatus === 'VALID' ? 'APPROVED' : 'REVIEW',
        reasons,
      ),
      audit.record({
        actorUserId: userId,
        action: 'CHECK_IN_RESULT',
        entityType: 'attendance_check_in',
        entityId: String(dto.sessionId),
        metadata: {
          status: finalStatus,
          reasons,
          distanceMeters: validation.distance,
          distanceToLecturer: validation.distanceToLecturer,
          lecturerProximityVerdict: validation.lecturerProximityVerdict,
        },
      }),
    ]);

    if (finalStatus === 'VALID') {
      return {
        status: 'VALID',
      };
    }

    return {
      status: 'REVIEW',
      reasons: reasons as [
        any,
        ...any[],
      ],
    };
  }
}
