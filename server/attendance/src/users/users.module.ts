import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './user.repository.token';
import { UsersService } from './users.service';
import { UserFilterService } from './user-filter.service';
import { UserController } from './user.controller';
import { PrismaUserRepository } from './infra/prisma/prisma-user.repository';
import { InMemoryUserRepository } from './infra/in-memory/in-memory-user.repository';
import { TagModule } from '../tags/tag.module';
import { UnitService } from '#units/units.service';
import { UnitModule } from '#units/units.module';

@Module({
  controllers: [UserController],
  imports: [TagModule, UnitModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    UsersService,
    UserFilterService,
  ],
  exports: [USER_REPOSITORY, UsersService, UserFilterService],
})
export class UsersModule {}
