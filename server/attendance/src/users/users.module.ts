import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { USER_REPOSITORY } from './user.repository.token';
import { UserController } from './user.controller';
import { UserFilterService } from './user-filter.service';
import { UsersService } from './users.service';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    UsersService,
    UserFilterService,
  ],
  exports: [UsersService, UserFilterService],
})
export class UsersModule {}