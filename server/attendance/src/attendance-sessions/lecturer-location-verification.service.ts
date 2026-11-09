import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { LecturerLocationVerificationDto } from './dto/lecturer-location-verification.dto';

@Injectable()
export class LecturerLocationVerificationService {
  private readonly MAX_CAPTURE_AGE_MS = 5 * 60 * 1000;
  private readonly MAX_FUTURE_SKEW_MS = 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    private readonly attendanceSessionsService: AttendanceSessionsService,
  ) {}

  async verify(
    sessionId: number,
    lecturerId: number,
    role: string,
    dto: LecturerLocationVerificationDto,
  ) {
    const session = await this.attendanceSessionsService.findByIdForUser(
      sessionId,
      { userId: lecturerId, role },
    );
    if (session.status === 'closed' || session.status === 'cancelled') {
      throw new BadRequestException('Không thể xác minh vị trí cho session đã kết thúc');
    }

    const clientTimestamp = new Date(dto.timestamp);
    const now = new Date();
    const ageMs = now.getTime() - clientTimestamp.getTime();
    if (
      ageMs > this.MAX_CAPTURE_AGE_MS ||
      ageMs < -this.MAX_FUTURE_SKEW_MS
    ) {
      throw new BadRequestException('GPS giảng viên đã cũ hoặc timestamp không hợp lệ; vui lòng lấy lại vị trí');
    }

    const distanceMeters = this.geoService.getDistanceInMeters(
      session.latitude,
      session.longitude,
      dto.latitude,
      dto.longitude,
    );
    const reasons: string[] = [];
    const radius = session.lecturerValidationRadius ?? null;

    if (radius === null) {
      reasons.push('LECTURER_RADIUS_NOT_CONFIGURED');
    } else if (distanceMeters + dto.accuracy > radius) {
      reasons.push('LECTURER_OUTSIDE_EXPECTED_LOCATION');
    }

    if (
      session.gpsAccuracyThreshold != null &&
      dto.accuracy > session.gpsAccuracyThreshold
    ) {
      reasons.push('LECTURER_GPS_ACCURACY_LOW');
    }

    const status = reasons.length === 0 ? 'PASS' : 'WARNING';
    const verification = await this.prisma.lecturerLocationVerification.create({
      data: {
        sessionId,
        lecturerId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        clientTimestamp,
        distanceMeters,
        status,
        reasons,
      },
    });
    if (status === 'PASS') {
      await this.attendanceSessionsService.cacheLecturerLocationVerification(
        sessionId,
        {
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          verifiedAt: verification.createdAt,
        },
      );
    }

    return {
      id: verification.id,
      sessionId,
      status,
      reasons,
      distanceMeters,
      capturedAt: clientTimestamp.toISOString(),
      verifiedAt: verification.serverTimestamp.toISOString(),
      sessionCenterChanged: false as const,
    };
  }
}
