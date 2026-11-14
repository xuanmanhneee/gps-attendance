import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// PrismaModule và RedisModule là @Global nên không cần import ở đây.
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
