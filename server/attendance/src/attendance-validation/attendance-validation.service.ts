import { Injectable } from '@nestjs/common';
import {
  AttendanceValidationReason,
  LocationPayload,
} from '@gps-attendance/shared';

import {
  AttendanceValidationInput,
  AttendanceValidationResult,
} from './attendance-validation.types';

import { IntegrityCheck } from './checks/integrity.check';
import { LocationCheck } from './checks/location.check';
import { MockLocationCheck } from './checks/mock-location.check';
import { GeoService } from '../geo/geo.service';
import { AttendanceSession } from '../attendance-sessions/attendance-session.model';

@Injectable()
export class AttendanceValidationService {
  private readonly INTEGRITY_WEIGHT = 35;
  private readonly MOCK_LOCATION_WEIGHT = 25;
  private readonly LOCATION_WEIGHT = 40;

  constructor(
    private readonly integrityCheck: IntegrityCheck,
    private readonly mockLocationCheck: MockLocationCheck,
    private readonly locationCheck: LocationCheck,
    private readonly geoService: GeoService,
  ) {}

  distanceToCenter(
    session: AttendanceSession,
    location: LocationPayload,
  ): number {
    return this.locationCheck.evaluate(location, session).distance;
  }

  validate(input: AttendanceValidationInput): AttendanceValidationResult {
    const mockCheck = this.mockLocationCheck.evaluate(input.location);
    const locationCheck = this.locationCheck.evaluate(
      input.location,
      input.session,
    );
    const integrityCheck = this.integrityCheck.evaluate(input.integrity);
    const distance = locationCheck.distance;
    const gpsAccuracy = Math.max(0, input.location.accuracy ?? 0);

    let distanceToLecturer: number | null = null;
    let lecturerProximityVerdict: 'NEAR' | 'FAR' | 'NO_DATA' | null = null;

    if (input.lecturerLocation) {
      distanceToLecturer = Math.round(
        this.geoService.getDistanceInMeters(
          input.location.latitude,
          input.location.longitude,
          input.lecturerLocation.latitude,
          input.lecturerLocation.longitude,
        ),
      );
      // Bán kính lân cận giảng viên (mặc định 25m hoặc theo cấu hình phòng/phiên)
      const nearThreshold = input.session.lecturerValidationRadius ?? 25;
      lecturerProximityVerdict = distanceToLecturer <= nearThreshold ? 'NEAR' : 'FAR';
    } else {
      lecturerProximityVerdict = 'NO_DATA';
    }

    if (mockCheck.coefficient === 0) {
      return {
        status: 'REJECTED',
        reasons: ['MOCK_LOCATION'],
        distance,
        distanceToLecturer,
        lecturerProximityVerdict,
      };
    }

    if (locationCheck.certainty === 'OUTSIDE') {
      return {
        status: 'REJECTED',
        reasons: ['OUT_OF_RANGE'],
        distance,
        distanceToLecturer,
        lecturerProximityVerdict,
      };
    }

    const sessionAccuracyThreshold =
      input.session.gpsAccuracyThreshold ?? null;

    if (
      sessionAccuracyThreshold != null &&
      gpsAccuracy > sessionAccuracyThreshold
    ) {
      return {
        status: 'REVIEW',
        reasons: ['LOW_LOCATION_ACCURACY'],
        distance,
        distanceToLecturer,
        lecturerProximityVerdict,
      };
    }

    if (locationCheck.certainty === 'INSIDE' && gpsAccuracy >= 35 && integrityCheck.coefficient < 0.8) {
      return {
        status: 'REVIEW',
        reasons: ['LOW_LOCATION_ACCURACY', 'LOW_CONFIDENCE_SCORE'],
        distance,
        distanceToLecturer,
        lecturerProximityVerdict,
      };
    }

    // -------------------------------------------------------------------------
    // Cơ chế điều chỉnh quyết định tại vùng biên (Dual-Anchor Decision Support)
    // -------------------------------------------------------------------------
    if (locationCheck.certainty === 'UNCERTAIN') {
      const nearSessionBoundary = distance >= input.session.radius * 0.75;
      const reasons: AttendanceValidationReason[] = ['UNCERTAIN_BOUNDARY'];

      if (lecturerProximityVerdict === 'NEAR') {
        // Sinh viên ở gần giảng viên: Tận dụng vị trí giảng viên để hỗ trợ
        // Thay vì bị loại cứng, hệ thống giữ ở trạng thái REVIEW kèm nhãn NEAR_LECTURER
        reasons.push('NEAR_LECTURER');
        return {
          status: 'REVIEW',
          reasons: reasons as [AttendanceValidationReason, ...AttendanceValidationReason[]],
          distance,
          distanceToLecturer,
          lecturerProximityVerdict,
        };
      } else if (lecturerProximityVerdict === 'FAR') {
        // Sinh viên ở xa giảng viên khi đang ở vùng biên
        reasons.push('FAR_FROM_LECTURER');
        reasons.push('LOW_LOCATION_ACCURACY');
        const riskySignal = gpsAccuracy >= 60 || integrityCheck.coefficient < 0.7;
        if (riskySignal || nearSessionBoundary) {
          reasons.push('LOW_CONFIDENCE_SCORE');
          return {
            status: 'REJECTED',
            reasons: reasons as [AttendanceValidationReason, ...AttendanceValidationReason[]],
            distance,
            distanceToLecturer,
            lecturerProximityVerdict,
          };
        }
        return {
          status: 'REVIEW',
          reasons: reasons as [AttendanceValidationReason, ...AttendanceValidationReason[]],
          distance,
          distanceToLecturer,
          lecturerProximityVerdict,
        };
      } else {
        // Không có dữ liệu GPS giảng viên (NO_DATA) -> fallback an toàn
        reasons.push('NO_LECTURER_LOCATION');
        reasons.push('LOW_LOCATION_ACCURACY');
        const riskySignal = gpsAccuracy >= 60 || integrityCheck.coefficient < 0.7;
        if (nearSessionBoundary && (riskySignal || (integrityCheck.coefficient < 0.75 && gpsAccuracy >= 35))) {
          reasons.push('LOW_CONFIDENCE_SCORE');
          return {
            status: 'REJECTED',
            reasons: reasons as [AttendanceValidationReason, ...AttendanceValidationReason[]],
            distance,
            distanceToLecturer,
            lecturerProximityVerdict,
          };
        }
        return {
          status: 'REVIEW',
          reasons: reasons as [AttendanceValidationReason, ...AttendanceValidationReason[]],
          distance,
          distanceToLecturer,
          lecturerProximityVerdict,
        };
      }
    }

    const score =
      mockCheck.coefficient * this.MOCK_LOCATION_WEIGHT +
      this.LOCATION_WEIGHT +
      integrityCheck.coefficient * this.INTEGRITY_WEIGHT;

    const reasons: AttendanceValidationReason[] = [];

    if (gpsAccuracy > 30 && integrityCheck.coefficient < 0.75) {
      reasons.push('LOW_CONFIDENCE_SCORE');
    }

    if (score < 80) {
      reasons.push('LOW_CONFIDENCE_SCORE');
    }

    if (score >= 80 && reasons.length === 0) {
      return {
        status: 'VALID',
        reasons: [],
        distance,
        distanceToLecturer,
        lecturerProximityVerdict,
      };
    }

    if (score >= 60) {
      return {
        status: 'REVIEW',
        reasons: reasons as [
          AttendanceValidationReason,
          ...AttendanceValidationReason[],
        ],
        distance,
        distanceToLecturer,
        lecturerProximityVerdict,
      };
    }

    if (reasons.length === 0) {
      reasons.push('LOW_CONFIDENCE_SCORE');
    }

    return {
      status: 'REJECTED',
      reasons: reasons as [
        AttendanceValidationReason,
        ...AttendanceValidationReason[],
      ],
      distance,
      distanceToLecturer,
      lecturerProximityVerdict,
    };
  }
}
