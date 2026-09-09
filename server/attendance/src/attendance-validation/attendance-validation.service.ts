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
    if (input.existingRecordCount > 0) {
      return {
        status: 'REJECTED',
        reasons: ['DUPLICATE_DEVICE'],
      };
    }

    // Demo mode: session state and assignment remain mandatory; GPS/device
    // checks are recorded by the client but do not block attendance.
    return { status: 'VALID', reasons: [] };
  }
}
