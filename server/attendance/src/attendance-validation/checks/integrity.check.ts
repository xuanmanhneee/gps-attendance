// integrity.check.ts
import { DeviceIntegrity } from '@gps-attendance/shared';

import { IntegrityCheckResult } from '../attendance-validation.types';

export class IntegrityCheck {
  evaluate(integrity: DeviceIntegrity): IntegrityCheckResult {
    // TODO: sau này verify Play Integrity / App Attest token thật.

    // Mock kết quả PI hiện tại.
    const coefficient = integrity.integrityToken ? 0.7 : 0.5;

    return {
      coefficient,
    };
  }
}
