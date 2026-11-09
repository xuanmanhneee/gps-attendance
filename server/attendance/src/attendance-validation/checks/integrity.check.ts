import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { serializeCheckInIntegrityInput } from '@gps-attendance/shared';

import { IntegrityCheckResult } from '../attendance-validation.types';
import type { AttendanceValidationInput } from '../attendance-validation.types';
import { INTEGRITY_VERIFIER } from '../integrity/integrity-verifier.token';
import type { IIntegrityVerifier } from '../integrity/integrity-verifier';

@Injectable()
export class IntegrityCheck {
  constructor(
    @Inject(INTEGRITY_VERIFIER)
    private readonly verifier: IIntegrityVerifier,
  ) {}

  async evaluate(
    input: AttendanceValidationInput,
  ): Promise<IntegrityCheckResult> {
    if (!this.verifier.isEnabled()) return { coefficient: 0.5 };
    if (!input.integrity.integrityToken) return { coefficient: 0 };

    const expectedRequestHash = createHash('sha256')
      .update(
        serializeCheckInIntegrityInput({
          sessionId: input.session.id,
          location: input.location,
          device: input.device,
        }),
      )
      .digest('hex');

    return {
      coefficient: (await this.verifier.verify({
        token: input.integrity.integrityToken,
        expectedRequestHash,
      }))
        ? 1
        : 0,
    };
  }
}
