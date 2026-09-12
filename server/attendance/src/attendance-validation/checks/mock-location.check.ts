// mock-location.check.ts
import { Location } from '@gps-attendance/shared';

import { MockLocationCheckResult } from '../attendance-validation.types';

export class MockLocationCheck {
  evaluate(location: Location): MockLocationCheckResult {
    return {
      coefficient: location.isMockLocation ? 0 : 1,
    };
  }
}
