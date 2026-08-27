import { Injectable } from '@nestjs/common';

import { ILoggerFactory } from './logger.factory';
import { ILogger } from './logger.interface';
import { NestLoggerAdapter } from './nest-logger.adapter';

@Injectable()
export class NestLoggerFactory implements ILoggerFactory {
  create(context: string): ILogger {
    return new NestLoggerAdapter(context);
  }
}
