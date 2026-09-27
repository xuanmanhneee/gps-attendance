import { Module, forwardRef } from '@nestjs/common';
import { AccountService } from './account.service';
import { ACCOUNT_REPOSITORY } from './account.repository.token';
import { PrismaAccountRepository } from './infra/prisma/prisma-account.repository';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UnitOfWorkModule } from '../common/unit-of-work/unit-of-work.module';

@Module({
  imports: [forwardRef(() => UsersModule), PrismaModule, UnitOfWorkModule],
  controllers: [AccountController],
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
