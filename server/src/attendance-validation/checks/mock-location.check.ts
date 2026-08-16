// mock-location.check.ts
import { LocationPayload } from '@gps-attendance/shared-types';

import { MockLocationCheckResult } from '../attendance-validation.types';

export class MockLocationCheck {
  evaluate(
    location: LocationPayload,
  ): MockLocationCheckResult {
    return {
      coefficient: location.isMockLocation ? 0 : 1,
    };
  }
}