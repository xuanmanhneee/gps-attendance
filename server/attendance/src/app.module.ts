import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { GeoModule } from './geo/geo.module';
import { AttendanceSessionsModule } from './attendance-sessions/attendance-sessions.module';
import { AttendanceValidationModule } from './attendance-validation/attendance-validation.module';
import { AttendanceCheckInModule } from './attendance-check-in/attendance-check-in.module';
import { LoggingModule } from './common/logging/logging.module';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 5, ttl: 60000 }],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AttendanceSessionsModule,
    GeoModule,
    AttendanceValidationModule,
    AttendanceCheckInModule,
    LoggingModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
