import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiResponse,
  UserErrorCode,
  UserProfileDto,
} from '@gps-attendance/shared';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from './user.model';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Route tĩnh 'me' PHẢI khai báo TRƯỚC route ':id'
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<UserProfileDto>> {
    const user = await this.usersService.findById(req.user.userId);

    if (!user) {
      throw new NotFoundException({
        code: UserErrorCode.NOT_FOUND,
        message: 'User không tồn tại',
      });
    }

    return {
      success: true,
      data: {
        code: user.code,
        role: user.role,
        fullname: user.fullname,
      },
    };
  }

  // 2. Route tĩnh danh sách chung
  @ApiOperation({ summary: 'Lấy danh sách tất cả users' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<ApiResponse<User[]>> {
    const users = await this.usersService.findAll();
    return {
      success: true,
      data: users,
    };
  }

  // 3. Route tham số động ':id' luôn đặt sau
  @ApiOperation({ summary: 'Lấy thông tin user theo id' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<User>> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException({
        code: UserErrorCode.NOT_FOUND,
        message: `User với id ${id} không tồn tại`,
      });
    }
    return {
      success: true,
      data: user,
    };
  }
}
