// src/common/unit-of-work/unit-of-work.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UNIT_OF_WORK } from './unit-of-work.token';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [{ provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork }],
  exports: [UNIT_OF_WORK],
})
export class UnitOfWorkModule {}
