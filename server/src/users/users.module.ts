import { Module } from '@nestjs/common';

import { MockUserRepository } from './repositories/mock-user.repository';
import { USER_REPOSITORY } from './user.repository.token';
import { UsersService } from './users.service';

@Module({
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: MockUserRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}