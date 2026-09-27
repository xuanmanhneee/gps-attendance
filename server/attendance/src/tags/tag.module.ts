// tag.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TagService, TAG_REPOSITORY } from './tag.service';
import { PrismaTagRepository } from './infra/prisma-tag.repository';
import { TagController } from './tag.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TagController],
  providers: [
    TagService,
    {
      provide: TAG_REPOSITORY,
      useClass: PrismaTagRepository,
    },
  ],
  exports: [TagService],
})
export class TagModule {}
