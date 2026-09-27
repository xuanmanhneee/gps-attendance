import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { ACCOUNT_REPOSITORY } from './account.repository.token';
<<<<<<< HEAD
import { PrismaAccountRepository } from './repositories/prisma-account.repository';

@Module({
=======
import { PrismaAccountRepository } from './infra/prisma/prisma-account.repository';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';

@Module({
  imports: [UsersModule],
  controllers: [AccountController],
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  providers: [
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountRepository,
    },
  ],
<<<<<<< HEAD
  exports: [AccountService, ACCOUNT_REPOSITORY],
=======
  exports: [AccountService],
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
})
export class AccountModule {}
