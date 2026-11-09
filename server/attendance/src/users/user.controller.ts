import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  Body,
  Controller,
  Get,
  Patch,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('v0/users')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

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

    return { success: true, data: this.toProfileResponse(user) };
  }

  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ người dùng hiện tại' })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<ApiResponse<UserProfileDto>> {
    const user = await this.usersService.updateProfile(req.user.userId, dto);
    if (!user) {
      throw new NotFoundException({
        code: UserErrorCode.NOT_FOUND,
        message: 'User không tồn tại',
      });
    }
    return { success: true, data: this.toProfileResponse(user) };
  }

  private toProfileResponse(user: User): UserProfileDto {
    return {
      code: user.code,
      role: user.role,
      fullname: user.fullname,
      email: user.email ?? null,
      phone: user.phone ?? null,
      dateOfBirth: user.dateOfBirth ?? null,
      gender: user.gender ?? null,
      address: user.address ?? null,
      programName: user.programName ?? null,
      cohort: user.cohort ?? null,
      studyMode: user.studyMode ?? null,
    };
  }

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
}
