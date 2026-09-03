import { ConsoleLogger } from '@nestjs/common';

const HIDDEN_CONTEXTS = [
  'NestFactory',
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestApplication',
];

export class AppBootstrapLogger extends ConsoleLogger {
  log(message: any, context?: string): void {
    if (context && HIDDEN_CONTEXTS.includes(context)) {
      return;
    }
    super.log(message, context);
  }
}
