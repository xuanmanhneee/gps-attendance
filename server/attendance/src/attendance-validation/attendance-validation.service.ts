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
import { LocationTimestampCheck } from './checks/location-timestamp.check';

@Injectable()
export class AttendanceValidationService {
  private readonly INTEGRITY_WEIGHT = 35;
  private readonly MOCK_LOCATION_WEIGHT = 25;
  private readonly LOCATION_WEIGHT = 40;

  constructor(
    private readonly integrityCheck: IntegrityCheck,
    private readonly mockLocationCheck: MockLocationCheck,
    private readonly locationCheck: LocationCheck,
    private readonly locationTimestampCheck: LocationTimestampCheck,
  ) {}

  validate(input: AttendanceValidationInput): AttendanceValidationResult {
    const mockLocationResult = this.mockLocationCheck.evaluate(input.location);

    if (mockLocationResult.coefficient === 0) {
      return { status: 'REJECTED', reasons: ['MOCK_LOCATION'] };
    }

    const locationTimestampResult = this.locationTimestampCheck.evaluate(
      input.location,
      input.checkedInAt,
    );

    if (!locationTimestampResult.isValid) {
      return {
        status: 'REJECTED',
        reasons: ['INVALID_LOCATION_TIMESTAMP'],
      };
    }

    let score = 0;
    const reasons: AttendanceValidationReason[] = [];

    score +=
      this.integrityCheck.evaluate(input.integrity).coefficient *
      this.INTEGRITY_WEIGHT;

    const locationResult = this.locationCheck.evaluate(
      input.location,
      input.session,
    );
    score += mockLocationResult.coefficient * this.MOCK_LOCATION_WEIGHT;
    score += locationResult.coefficient * this.LOCATION_WEIGHT;

    if (locationResult.coefficient === 0) {
      reasons.push('OUT_OF_RANGE');
    }

    if (score >= 80) {
      return { status: 'VALID' };
      // ↑ không thể kèm reasons — compiler chặn nếu bạn lỡ tay thêm vào
    }

    if (score >= 60) {
      reasons.push('LOW_CONFIDENCE_SCORE');
      return {
        status: 'REVIEW',
        reasons: reasons as [
          AttendanceValidationReason,
          ...AttendanceValidationReason[],
        ],
      };
    }

    if (reasons.length === 0) reasons.push('LOW_CONFIDENCE_SCORE'); // fallback nếu REJECTED mà chưa có reason cụ thể nào
    return {
      status: 'REJECTED',
      reasons: reasons as [
        AttendanceValidationReason,
        ...AttendanceValidationReason[],
      ],
    };
  }
}
