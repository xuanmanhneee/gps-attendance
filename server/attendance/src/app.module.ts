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
<<<<<<< HEAD
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
=======
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TagModule } from './tags/tag.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { UnitOfWorkModule } from '#common/unit-of-work/unit-of-work.module';
import { UnitModule } from '#units/units.module';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

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
<<<<<<< HEAD
    HealthModule,
=======
    PrismaModule,
    RedisModule,
    TagModule,
    UnitOfWorkModule,
    UnitModule,
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  ],
  controllers: [AppController],
  providers: [
    AppService,
<<<<<<< HEAD
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
=======
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
