import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ApiResponse,
  AuthErrorCode,
  LoginResponse,
} from '@gps-attendance/shared';

import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { LoginDto } from '../dto/login.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('user-auth')
@Controller('v0/user/auth')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'User đăng nhập, trả về access token',
  })
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  async login(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<LoginResponse>> {
    if (user.role !== 'student') {
      throw new UnauthorizedException({
        code: AuthErrorCode.ROLE_NOT_ALLOWED,
        message: 'Tài khoản không được phép đăng nhập bằng user endpoint',
      });
    }

    return {
      success: true,
      data: this.authService.login(user),
    };
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    return { success: true, data: this.authService.refresh(refreshToken) };
  }
}
