import { Module } from '@nestjs/common';
import { UnitController } from './unit.controller';
import { UnitService } from './units.service';
import { UNIT_REPOSITORY } from './unit.repository.token';
import { InMemoryUnitRepository } from './infra/in-memory/in-memory-unit.repository';
import { PrismaUnitRepository } from './infra/prisma/prisma-unit.repository';

@Module({
  controllers: [UnitController],
  providers: [
    UnitService,
    {
      provide: UNIT_REPOSITORY,
      useClass: PrismaUnitRepository,
    },
  ],
  exports: [UnitService],
})
export class UnitModule {}
