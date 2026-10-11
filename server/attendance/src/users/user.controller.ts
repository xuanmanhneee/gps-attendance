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
import {
  UserFilterCriteria,
  UserProfileResponse,
} from '@gps-attendance/shared';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserFilterService } from './user-filter.service';
import { UserFilterDto } from './dto/user-filter.dto';

@ApiBearerAuth()
@Controller('v0/users')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userFilterService: UserFilterService,
  ) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserProfileResponse> {
    const user = await this.usersService.findById(req.user.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      code: user.code,
      role: user.role,
      fullname: user?.fullname,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post('test-filter') async testFilter(@Body() criteria: UserFilterDto) {
    return this.userFilterService.resolveUserIds(criteria);
  }
}
