import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { ACCOUNT_REPOSITORY } from './account.repository.token';
import { PrismaAccountRepository } from './repositories/prisma-account.repository';

@Module({
  providers: [
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountRepository,
    },
  ],
  exports: [AccountService, ACCOUNT_REPOSITORY],
})
export class AccountModule {}
