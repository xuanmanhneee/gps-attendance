import { Module } from '@nestjs/common';

import { AttendanceValidationService } from './attendance-validation.service';

@Module({
  providers: [
    AttendanceValidationService,
  ],
  exports: [
    AttendanceValidationService,
  ],
})
export class AttendanceValidationModule {}