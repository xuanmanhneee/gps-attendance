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
import { ApiResponse, AttendanceSessionDetailResponse, AttendanceSessionResponse } from '@gps-attendance/shared';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
import { toAttendanceSessionResponse } from './attendance-session.mapper';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller('/v0/attendance-sessions')
export class AttendanceSessionsController {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceSessionQueryService: AttendanceSessionQueryService,
  ) {}

  @ApiOperation({ summary: 'Tạo session điểm danh mới (admin/lecturer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Post()
  async create(
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<AttendanceSessionResponse>> {
    const session = await this.attendanceSessionsService.create(dto, user.userId);
    return { success: true, data: toAttendanceSessionResponse(session) };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findAll();
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByUser(user.userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-user/:userId')
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByUser(userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/detail')
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<AttendanceSessionDetailResponse>> {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.getDetail(id),
    };
  }
}