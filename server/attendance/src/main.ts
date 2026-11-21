import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
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

const isProduction = process.env.NODE_ENV === 'production';

// Secret yếu cho phép giả mạo JWT của bất kỳ role nào, nên production phải
// từ chối khởi động thay vì chạy với secret rỗng/ngắn.
function assertJwtSecret() {
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length >= 32) return;
  const message = 'JWT_SECRET phải dài tối thiểu 32 ký tự';
  if (isProduction) throw new Error(message);
  console.warn(`[security] ${message} (bỏ qua vì không phải production)`);
}

// TRUST_PROXY: số hop (vd "1" khi sau một nginx), "true", hoặc danh sách
// IP/CIDR của Express. Cần để `req.ip` là IP client thật khi chạy sau proxy.
function readTrustProxy(): boolean | number | string | undefined {
  const raw = process.env.TRUST_PROXY;
  if (!raw) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

// CORS_ORIGINS: danh sách origin được phép, ngăn cách bằng dấu phẩy. Để trống:
// dev cho phép mọi origin; production tắt CORS (app mobile không cần CORS,
// dashboard phải khai báo origin của nó).
function corsOptions() {
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) return { origin: origins };
  return isProduction ? null : { origin: true };
}

async function bootstrap() {
  assertJwtSecret();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppBootstrapLogger(),
  });

  app.disable('x-powered-by');
  const trustProxy = readTrustProxy();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.use(
    (
      _req: unknown,
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  const cors = corsOptions();
  if (cors) app.enableCors(cors);

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

  // Tài liệu API lộ toàn bộ route và DTO nên production mặc định tắt.
  const swaggerEnabled = !isProduction || process.env.ENABLE_SWAGGER === 'true';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

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
  printBanner(url, swaggerEnabled ? `${url}/api-docs` : '(tắt)');
}
void bootstrap();
