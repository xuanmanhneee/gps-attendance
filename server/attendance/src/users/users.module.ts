import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { PrismaUserRepository } from './repositories/prisma-user.repository';
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
import { USER_REPOSITORY } from './user.repository.token';
import { UserController } from './user.controller';
<<<<<<< HEAD
import { UserFilterService } from './user-filter.service';
import { UsersService } from './users.service';
=======
import { PrismaUserRepository } from './infra/prisma/prisma-user.repository';
import { InMemoryUserRepository } from './infra/in-memory/in-memory-user.repository';
import { TagModule } from '../tags/tag.module';
import { UnitService } from '#units/units.service';
import { UnitModule } from '#units/units.module';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

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