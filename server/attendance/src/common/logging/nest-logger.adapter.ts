import { Injectable } from '@nestjs/common';
import { ILogger } from './logger.interface';
import { WinstonJsonLogger } from './winston-logger.service';

@Injectable()
export class NestLoggerAdapter implements ILogger {
  private readonly logger: WinstonJsonLogger;

  constructor(context: string) {
    this.logger = new WinstonJsonLogger(context);
  }

  log(message: string): void {
    this.logger.log(message);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  error(message: string, trace?: string): void {
    this.logger.error(message, trace);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  verbose(message: string): void {
    this.logger.verbose(message);
  }
}
