import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
<<<<<<< HEAD
import {
  ApiResponse,
  UserErrorCode,
  UserProfileDto,
} from '@gps-attendance/shared';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from './user.model';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
=======
import { UserFilterCriteria, UserProfileResponse } from '@gps-attendance/shared';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserFilterService } from './user-filter.service';
import { UserFilterDto } from './dto/user-filter.dto';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

@ApiTags('users')
@ApiBearerAuth()
@Controller('v0/users')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userFilterService: UserFilterService,
  ) {}

  // 1. Route tĩnh 'me' PHẢI khai báo TRƯỚC route ':id'
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
<<<<<<< HEAD
  async getMe(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<UserProfileDto>> {
=======
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserProfileResponse> {
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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

  @Post('test-filter') async testFilter(@Body() criteria: UserFilterDto) {
    return this.userFilterService.resolveUserIds(criteria as UserFilterCriteria);
  }
}
