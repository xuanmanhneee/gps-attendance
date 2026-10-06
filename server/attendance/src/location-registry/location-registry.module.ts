import { Module } from '@nestjs/common';
import { LocationRegistryController } from './location-registry.controller';
import { LocationRegistryService } from './location-registry.service';

@Module({
  controllers: [LocationRegistryController],
  providers: [LocationRegistryService],
  exports: [LocationRegistryService],
})
export class LocationRegistryModule {}
