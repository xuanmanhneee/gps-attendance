import { Module } from '@nestjs/common';

import { AttendanceValidationService } from './attendance-validation.service';
import { IntegrityCheck } from './checks/integrity.check';
import { MockLocationCheck } from './checks/mock-location.check';
import { LocationCheck } from './checks/location.check';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [GeoModule],
  providers: [
    AttendanceValidationService,
    IntegrityCheck,
    MockLocationCheck,
    LocationCheck,
  ],
  exports: [AttendanceValidationService],
})
export class AttendanceValidationModule {}