import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AUDIT_LOG_REPOSITORY } from './audit-log.repository.token';
import { PrismaAuditLogRepository } from './infra/prisma-audit-log.repository';

@Module({
  providers: [
    AuditLogService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
