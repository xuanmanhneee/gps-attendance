import { Module } from '@nestjs/common';

import { AttendanceValidationService } from './attendance-validation.service';
import { IntegrityCheck } from './checks/integrity.check';
import { MockLocationCheck } from './checks/mock-location.check';
import { LocationCheck } from './checks/location.check';
import { LocationTimestampCheck } from './checks/location-timestamp.check';
import { GeoModule } from '../geo/geo.module';
import { INTEGRITY_VERIFIER } from './integrity/integrity-verifier.token';
import { PlayIntegrityVerifier } from './integrity/play-integrity.verifier';

@Module({
  imports: [GeoModule],
  providers: [
    AttendanceValidationService,
    IntegrityCheck,
    MockLocationCheck,
    LocationCheck,
    LocationTimestampCheck,
    {
      provide: INTEGRITY_VERIFIER,
      useClass: PlayIntegrityVerifier,
    },
  ],
  exports: [AttendanceValidationService],
})
export class AttendanceValidationModule {}
