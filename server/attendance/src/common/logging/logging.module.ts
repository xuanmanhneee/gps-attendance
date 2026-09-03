import { Global, Module } from '@nestjs/common';
import { LOGGER_FACTORY } from './logger.token';
import { NestLoggerFactory } from './nest-logger.factory';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER_FACTORY,
      useClass: NestLoggerFactory,
    },
  ],
  exports: [LOGGER_FACTORY],
})
export class LoggingModule {}
