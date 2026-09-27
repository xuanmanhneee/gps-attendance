import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class WinstonJsonLogger implements LoggerService {
  private readonly winstonInstance: winston.Logger;

  constructor(private context: string = 'Application') {
    this.winstonInstance = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'gps-attendance-server',
        context: this.context,
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.winstonInstance.info(
      typeof message === 'object' ? JSON.stringify(message) : String(message),
      { context: context || this.context },
    );
  }

  error(message: any, trace?: string, context?: string) {
    this.winstonInstance.error(
      typeof message === 'object' ? JSON.stringify(message) : String(message),
      { trace, context: context || this.context },
    );
  }

  warn(message: any, context?: string) {
    this.winstonInstance.warn(
      typeof message === 'object' ? JSON.stringify(message) : String(message),
      { context: context || this.context },
    );
  }

  debug(message: any, context?: string) {
    this.winstonInstance.debug(
      typeof message === 'object' ? JSON.stringify(message) : String(message),
      { context: context || this.context },
    );
  }

  verbose(message: any, context?: string) {
    this.winstonInstance.verbose(
      typeof message === 'object' ? JSON.stringify(message) : String(message),
      { context: context || this.context },
    );
  }
}
