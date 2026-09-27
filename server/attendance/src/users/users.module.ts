import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './user.repository.token';
import { UserController } from './user.controller';
import { UserFilterService } from './user-filter.service';
import { UsersService } from './users.service';
import { PrismaUserRepository } from './infra/prisma/prisma-user.repository';
import { TagModule } from '../tags/tag.module';
import { UnitModule } from '../units/units.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TagModule, UnitModule, PrismaModule],
  controllers: [UserController],
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