import { Module } from '@nestjs/common';

import { MockUserRepository } from './repositories/mock-user.repository';
import { USER_REPOSITORY } from './user.repository.token';
import { UsersService } from './users.service';
import { UserFilterService } from './user-filter.service';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: MockUserRepository,
    },
    UsersService,
    UserFilterService,
  ],
  exports: [UsersService, UserFilterService],
})
export class UsersModule {}
