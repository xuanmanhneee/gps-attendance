import { Module } from '@nestjs/common';
import { DeviceTrustController } from './device-trust.controller';
import { DeviceTrustService } from './device-trust.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [DeviceTrustController],
  providers: [DeviceTrustService],
})
export class DeviceTrustModule {}
