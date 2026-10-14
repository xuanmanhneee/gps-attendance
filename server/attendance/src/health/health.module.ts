import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from '../common/database/database.module';
import { RedisModule } from '../redis/redis.module';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService, MonitoringService],
  exports: [HealthService, MonitoringService],
})
export class HealthModule {}
