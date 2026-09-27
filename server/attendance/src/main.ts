import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { WinstonJsonLogger } from './common/logging/winston-logger.service';

function printBanner(url: string, docsUrl: string) {
  const lines = [
    `🚀  Server is running (Ctrl + C to stop)`,
    ``,
    `   Local:   ${url}`,
    `   Docs :   ${docsUrl}`,
    `   Env  :   ${process.env.NODE_ENV ?? 'development'}`,
  ];

  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const top = `╭${'─'.repeat(width)}╮`;
  const bottom = `╰${'─'.repeat(width)}╯`;

  const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
  const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

  console.log(cyan(top));
  for (const line of lines) {
    const padded = line.padEnd(width - 2);
    console.log(cyan('│') + '  ' + bold(padded) + cyan('│'));
  }
  console.log(cyan(bottom));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonJsonLogger('Nest'),
  });

<<<<<<< HEAD
  app.useGlobalFilters(new ApiExceptionFilter());

=======
  app.useGlobalInterceptors(new ResponseInterceptor());
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Attendance API')
    .setDescription('API cho hệ thống điểm danh')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const url = await app.getUrl();
  printBanner(url, `${url}/api-docs`);
}
bootstrap();
