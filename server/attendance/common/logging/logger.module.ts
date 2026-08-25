import { Global, Module } from '@nestjs/common';
import { LOGGER } from './logger.token';
import { NestLoggerAdapter } from './nest-logger.adapter';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useClass: NestLoggerAdapter,
    },
  ],
  exports: [LOGGER],
})
export class LoggerModule {}