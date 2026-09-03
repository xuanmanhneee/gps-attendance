import { ILogger } from './logger.interface';

export interface ILoggerFactory {
  create(context: string): ILogger;
}
