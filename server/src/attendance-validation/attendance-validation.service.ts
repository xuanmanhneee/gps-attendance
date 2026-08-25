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

  validate(
    input: AttendanceValidationInput,
  ): AttendanceValidationResult {
    const reasons: AttendanceValidationReason[] = [];

    // -------------------------------------------------------------------------
    // Hard-block
    // -------------------------------------------------------------------------

    if (input.existingRecordCount > 0) {
      return {
        status: 'REJECTED',
        reasons: ['DUPLICATE_DEVICE'],
      };
    }

    const mockLocationResult =
      this.mockLocationCheck.evaluate(input.location);

    if (mockLocationResult.coefficient === 0) {
      return {
        status: 'REJECTED',
        reasons: ['MOCK_LOCATION'],
      };
    }

    // -------------------------------------------------------------------------
    // Risk scoring
    // -------------------------------------------------------------------------

    let score = 0;

    const integrityResult =
      this.integrityCheck.evaluate(input.integrity);

    score +=
      integrityResult.coefficient *
      this.INTEGRITY_WEIGHT;

    const locationResult =
      this.locationCheck.evaluate(
        input.location,
        input.session,
      );

    score +=
      mockLocationResult.coefficient *
      this.MOCK_LOCATION_WEIGHT;

    score +=
      locationResult.coefficient *
      this.LOCATION_WEIGHT;

    if (locationResult.coefficient === 0) {
      reasons.push('OUT_OF_RANGE');
    }

    // -------------------------------------------------------------------------
    // Result
    // -------------------------------------------------------------------------

    let status: AttendanceValidationStatus;

    if (score >= 80) {
      status = 'VALID';
    } else if (score >= 60) {
      status = 'REVIEW';
    } else {
      status = 'REJECTED';
    }

    return {
      status,
      reasons,
    };
  }
}