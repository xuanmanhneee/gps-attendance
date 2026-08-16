import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AttendanceSessionsModule } from './attendance-sessions/attendance-sessions.module';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [AuthModule, UsersModule, AttendanceSessionsModule, GeoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}