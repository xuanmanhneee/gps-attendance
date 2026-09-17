import { Module } from '@nestjs/common';
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
import { PrismaModule } from './prisma/prisma.module';
import { TagModule } from './tags/tag.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { UnitOfWorkModule } from '#common/unit-of-work/unit-of-work.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    AttendanceSessionsModule,
    GeoModule,
    AttendanceValidationModule,
    AttendanceCheckInModule,
    LoggingModule,
    PrismaModule,
    TagModule,
    UnitOfWorkModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
