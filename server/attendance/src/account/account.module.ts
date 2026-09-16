import { Module } from '@nestjs/common';

import { AccountService } from './account.service';
import { ACCOUNT_REPOSITORY } from './account.repository.token';
import { PrismaAccountRepository } from './infra/prisma/prisma-account.repository';
import { InMemoryAccountRepository } from './infra/in-memory/in-memory-account.repository';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';

@Module({
  imports: [UsersModule],
  controllers: [AccountController],
  providers: [
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: InMemoryAccountRepository,
    },
  ],
  exports: [AccountService],
})
export class AccountModule {}
