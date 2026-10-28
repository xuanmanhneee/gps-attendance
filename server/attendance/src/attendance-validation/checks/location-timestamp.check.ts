import { Injectable } from '@nestjs/common';
import { Location } from '@gps-attendance/shared';

import { LocationTimestampCheckResult } from '../attendance-validation.types';

@Injectable()
export class LocationTimestampCheck {
  private readonly MAX_AGE_MS = 2 * 60_000;
  private readonly MAX_FUTURE_SKEW_MS = 30_000;

  evaluate(
    location: Location,
    checkedInAt: Date,
  ): LocationTimestampCheckResult {
    const ageMs = checkedInAt.getTime() - location.timestamp;

    return {
      isValid:
        ageMs <= this.MAX_AGE_MS && ageMs >= -this.MAX_FUTURE_SKEW_MS,
      ageMs,
    };
  }
}
