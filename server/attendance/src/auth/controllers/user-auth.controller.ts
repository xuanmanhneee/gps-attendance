import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthErrorCode, type LoginResponse } from '@gps-attendance/shared';

import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { ClientRateLimitGuard } from '../guards/client-rate-limit.guard';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@ApiTags('user-auth')
@Controller('v0/user/auth')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'User đăng nhập, trả về access token và refresh token',
  })
  @Post('login')
  @UseGuards(ClientRateLimitGuard, LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  async login(@CurrentUser() user: AuthenticatedUser): Promise<LoginResponse> {
    if (user.role !== 'participant') {
      throw new UnauthorizedException({
        code: AuthErrorCode.ROLE_NOT_ALLOWED,
        message: 'Tài khoản không được phép đăng nhập bằng user endpoint',
      });
    }

    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Đổi refresh token lấy cặp token mới' })
  @Post('refresh')
  @UseGuards(ClientRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: RefreshTokenDto })
  refresh(@Body() request: RefreshTokenDto): Promise<LoginResponse> {
    return this.authService.refresh(request.refreshToken);
  }

  @ApiOperation({ summary: 'Đăng xuất: thu hồi refresh token hiện tại' })
  @Post('logout')
  @UseGuards(ClientRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: RefreshTokenDto })
  async logout(@Body() request: RefreshTokenDto): Promise<null> {
    await this.authService.logout(request.refreshToken);
    return null;
  }
}
