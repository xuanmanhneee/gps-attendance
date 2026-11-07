import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AuthErrorCode,
  type ApiResponse,
  type LoginResponse,
} from '@gps-attendance/shared';

import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { LoginDto } from '../dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { DeviceRateLimitGuard } from '../../common/guards/device-rate-limit.guard';

@ApiTags('admin-auth')
@Controller('v0/admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Admin đăng nhập, trả về access token',
  })
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(DeviceRateLimitGuard, LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  async login(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<LoginResponse>> {
    if (user.role !== 'admin' && user.role !== 'organizer') {
      throw new UnauthorizedException({
        code: AuthErrorCode.ROLE_NOT_ALLOWED,
        message: 'Tài khoản không được phép đăng nhập bằng admin endpoint',
      });
    }

    return {
      success: true,
      data: await this.authService.login(user),
    };
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    return { success: true, data: await this.authService.refresh(refreshToken) };
  }

  @ApiOperation({
    summary: 'Admin/Lecturer đăng xuất và thu hồi token trên server',
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') refreshToken?: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<ApiResponse<null>> {
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    await this.authService.logout(accessToken, refreshToken);
    return {
      success: true,
      data: null,
    };
  }
}
