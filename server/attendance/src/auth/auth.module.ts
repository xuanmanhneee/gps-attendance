import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { UserAuthController } from './controllers/user-auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AccountModule } from '../account/account.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuditLogService } from '../common/audit/audit-log.service';
import { DeviceRateLimitGuard } from '../common/guards/device-rate-limit.guard';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';

@Module({
  imports: [
    UsersModule,
    AccountModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('EXPIRES_IN') ??
            '1h') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],

  controllers: [AdminAuthController, UserAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    AuditLogService,
    DeviceRateLimitGuard,
    RateLimitService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
