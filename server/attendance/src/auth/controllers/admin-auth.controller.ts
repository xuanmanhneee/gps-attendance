import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ApiResponse, LoginResponse } from '@gps-attendance/shared';

import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { LoginDto } from '../dto/login.dto';

@ApiTags('admin-auth')
@Controller('v0/admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Admin đăng nhập, trả về access token',
  })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  async login(@CurrentUser() user: AuthenticatedUser): Promise<LoginResponse> {
    if (user.role !== 'admin' && user.role !== 'lecturer') {
      throw new UnauthorizedException({
        code: 'AUTH_ROLE_NOT_ALLOWED',
        message: 'Tài khoản không được phép đăng nhập bằng admin endpoint',
      });
    }

    return await this.authService.login(user);
  }
}
