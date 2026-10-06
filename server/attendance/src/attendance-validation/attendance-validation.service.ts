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

    if (mockCheck.coefficient === 0) {
      return {
        status: 'REJECTED',
        reasons: ['MOCK_LOCATION'],
        distance,
      };
    }

    if (locationCheck.certainty === 'OUTSIDE') {
      return {
        status: 'REJECTED',
        reasons: ['OUT_OF_RANGE'],
        distance,
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
      };
    }

    if (locationCheck.certainty === 'INSIDE' && gpsAccuracy >= 35 && integrityCheck.coefficient < 0.8) {
      return {
        status: 'REVIEW',
        reasons: ['LOW_LOCATION_ACCURACY', 'LOW_CONFIDENCE_SCORE'],
        distance,
      };
    }

    if (locationCheck.certainty === 'UNCERTAIN') {
      const nearSessionBoundary = distance >= input.session.radius * 0.75;
      const riskySignal = gpsAccuracy >= 60 || integrityCheck.coefficient < 0.7;

      if (integrityCheck.coefficient < 0.75 && gpsAccuracy >= 35) {
        return {
          status: nearSessionBoundary ? 'REJECTED' : 'REVIEW',
          reasons: nearSessionBoundary
            ? ['LOW_LOCATION_ACCURACY', 'LOW_CONFIDENCE_SCORE']
            : ['LOW_LOCATION_ACCURACY', 'LOW_CONFIDENCE_SCORE'],
          distance,
        };
      }

      if (riskySignal && nearSessionBoundary) {
        return {
          status: 'REJECTED',
          reasons: ['LOW_LOCATION_ACCURACY', 'LOW_CONFIDENCE_SCORE'],
          distance,
        };
      }

      return {
        status: 'REVIEW',
        reasons: ['LOW_LOCATION_ACCURACY'],
        distance,
      };
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
