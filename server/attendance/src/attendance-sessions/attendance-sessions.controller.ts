import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AttendanceSessionsService } from './attendance-sessions.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller('attendance-sessions')
export class AttendanceSessionsController {
  constructor(private readonly attendanceSessionsService: AttendanceSessionsService) {}

  @ApiOperation({ summary: 'Tạo session điểm danh mới (chỉ admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Post()
  async create(
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() user: { userId: number },
  ) {
    const session = await this.attendanceSessionsService.create(dto, user.userId);

    return { session };
  }

  @ApiOperation({ summary: 'Danh sách session' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.attendanceSessionsService.getAll();
  }

  @ApiOperation({ summary: 'Chi tiết 1 session' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceSessionsService.getById(id);
  }

  @Get('by-user/:userId')
  async findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return await this.attendanceSessionsService.findByUser(userId);
  }
}
