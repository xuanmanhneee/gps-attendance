import { Module } from '@nestjs/common';

import { RateLimiterService } from './rate-limiter.service';

// RedisModule là global nên không cần import lại ở đây.
@Module({
  providers: [RateLimiterService],
  exports: [RateLimiterService],
})
export class RateLimitModule {}
