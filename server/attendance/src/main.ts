import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { AppBootstrapLogger } from './common/logging/app-bootstrap.logger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

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
    logger: new AppBootstrapLogger(),
  });

  app.useGlobalInterceptors(new ResponseInterceptor());
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
  // Node mặc định backlog 511: khi cả lớp check-in cùng lúc, SYN vượt hàng
  // đợi bị kernel bỏ và client phải gửi lại sau ~1s. Giá trị thực tế còn bị
  // giới hạn bởi net.core.somaxconn của máy/container.
  const backlog = Number(process.env.HTTP_BACKLOG ?? 4096);
  if (!Number.isSafeInteger(backlog) || backlog < 1) {
    throw new Error('HTTP_BACKLOG must be a positive integer');
  }
  // Nest truyền nguyên tham số xuống http.Server.listen(port, host, backlog)
  // nhưng type của listen() chưa khai báo backlog.
  await (
    app.listen as (
      port: number | string,
      ...args: unknown[]
    ) => Promise<unknown>
  ).call(app, port, '0.0.0.0', backlog);

  const url = await app.getUrl();
  printBanner(url, `${url}/api-docs`);
}
bootstrap();
