import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { UserAuthController } from './controllers/user-auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AccountModule } from '../account/account.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { REFRESH_SESSION_REPOSITORY } from './refresh-session.repository.token';
import { PrismaRefreshSessionRepository } from './infra/prisma/prisma-refresh-session.repository';

@Module({
  imports: [
    UsersModule,
    AccountModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],

  controllers: [AdminAuthController, UserAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    {
      provide: REFRESH_SESSION_REPOSITORY,
      useClass: PrismaRefreshSessionRepository,
    },
  ],
})
export class AuthModule {}
