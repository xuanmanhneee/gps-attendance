import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TagModule } from './tags/tag.module';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { UnitOfWorkModule } from './common/unit-of-work/unit-of-work.module';
import { UnitModule } from './units/units.module';
import { LocationRegistryModule } from './location-registry/location-registry.module';
import { DeviceTrustModule } from './device-trust/device-trust.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      // General dashboard/mobile traffic includes several parallel reads;
      // stricter limits remain configured on login and check-in endpoints.
      throttlers: [{ limit: 120, ttl: 60000 }],
    }),
    DatabaseModule,
    PrismaModule,
    RedisModule,
    TagModule,
    UnitOfWorkModule,
    UnitModule,
    AuthModule,
    UsersModule,
    AttendanceSessionsModule,
    LocationRegistryModule,
    DeviceTrustModule,
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
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
