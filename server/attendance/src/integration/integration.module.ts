import { Module } from '@nestjs/common';

import { AttendanceRecordModule } from '#attendance-record/attendance-record.module';
import { AttendanceSessionsModule } from '#attendance-sessions/attendance-sessions.module';
import { UnitModule } from '#units/units.module';
import { UsersModule } from '#user/users.module';
import { TagModule } from '../tags/tag.module';
import { AccountModule } from '../account/account.module';

import { IntegrationApiKeyGuard } from './integration-api-key.guard';
import { IntegrationController } from './integration.controller';
import { PrismaIntegrationSessionLinkRepository } from './infra/prisma/prisma-integration-session-link.repository';
import { INTEGRATION_SESSION_LINK_REPOSITORY } from './integration-session-link.token';
import { IntegrationService } from './integration.service';

@Module({
  imports: [
    UnitModule,
    UsersModule,
    AttendanceSessionsModule,
    AttendanceRecordModule,
    TagModule,
    AccountModule,
  ],
  controllers: [IntegrationController],
  providers: [
    IntegrationService,
    IntegrationApiKeyGuard,
    {
      provide: INTEGRATION_SESSION_LINK_REPOSITORY,
      useClass: PrismaIntegrationSessionLinkRepository,
    },
  ],
})
export class IntegrationModule {}
