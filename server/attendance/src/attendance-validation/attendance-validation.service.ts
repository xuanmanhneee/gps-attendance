import { Injectable } from '@nestjs/common';
import {
  AttendanceValidationReason,
  AttendanceValidationStatus,
} from '@gps-attendance/shared';

import {
  AttendanceValidationInput,
  AttendanceValidationResult,
} from './attendance-validation.types';

import { IntegrityCheck } from './checks/integrity.check';
import { LocationCheck } from './checks/location.check';
import { MockLocationCheck } from './checks/mock-location.check';

@Injectable()
export class AttendanceValidationService {
  private readonly INTEGRITY_WEIGHT = 35;
  private readonly MOCK_LOCATION_WEIGHT = 25;
  private readonly LOCATION_WEIGHT = 40;

  constructor(
    private readonly integrityCheck: IntegrityCheck,
    private readonly mockLocationCheck: MockLocationCheck,
    private readonly locationCheck: LocationCheck,
  ) {}

  validate(input: AttendanceValidationInput): AttendanceValidationResult {
    const mockCheck = this.mockLocationCheck.evaluate(input.location);
    const locationCheck = this.locationCheck.evaluate(
      input.location,
      input.session,
    );
    const integrityCheck = this.integrityCheck.evaluate(input.integrity);
    const distance = locationCheck.distance;

    // Giả mạo vị trí bị chặn trực tiếp
    if (mockCheck.coefficient === 0) {
      return {
        status: 'REJECTED',
        reasons: ['MOCK_LOCATION'],
        distance,
      };
    }

    const score =
      mockCheck.coefficient * this.MOCK_LOCATION_WEIGHT +
      locationCheck.coefficient * this.LOCATION_WEIGHT +
      integrityCheck.coefficient * this.INTEGRITY_WEIGHT;

    const reasons: AttendanceValidationReason[] = [];

    if (locationCheck.coefficient === 0) {
      reasons.push('OUT_OF_RANGE');
    }

    if (score < 80 && locationCheck.coefficient !== 0) {
      reasons.push('LOW_CONFIDENCE_SCORE');
    }

    if (score >= 80 && reasons.length === 0) {
      return { status: 'VALID', reasons: [], distance };
    }

    if (score >= 60) {
      return {
        status: 'REVIEW',
        reasons: reasons as [
          AttendanceValidationReason,
          ...AttendanceValidationReason[],
        ],
        distance,
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
    };
  }
}
