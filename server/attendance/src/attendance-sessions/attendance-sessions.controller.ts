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
import { toAttendanceSessionResponse } from './attendance-session.mapper';
import {
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
} from '@gps-attendance/shared';
import { AttendanceSessionQueryService } from './attendance-session-query.service';

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
  ): Promise<AttendanceSessionResponse> {
    const session = await this.attendanceSessionsService.create(
      dto,
      user.userId,
    );
    return toAttendanceSessionResponse(session);
  }

  @ApiOperation({ summary: 'Danh sách session' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<AttendanceSessionResponse[]> {
    const sessions = await this.attendanceSessionsService.findAll();
    return sessions.map(toAttendanceSessionResponse);
  }

  @ApiOperation({ summary: 'Chi tiết 1 session' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/detail')
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AttendanceSessionDetailResponse> {
    return this.attendanceSessionQueryService.getDetail(id);
  }

  @Get('by-user/:userId')
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<AttendanceSessionResponse[]> {
    const sessions = await this.attendanceSessionsService.findByUser(userId);
    return sessions.map(toAttendanceSessionResponse);
  }
}
