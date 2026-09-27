import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiResponse,
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
} from '@gps-attendance/shared';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
import { toAttendanceSessionResponse } from './attendance-session.mapper';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller(['attendance-sessions', 'v0/attendance-sessions'])
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
    const session = await this.attendanceSessionsService.create(
      dto,
      user.userId,
    );
    return { success: true, data: toAttendanceSessionResponse(session) };
  }

  // ---- 1. CÁC ROUTE TĨNH (STATIC PATHS) PHẢI KHAI BÁO ĐẦU TIÊN ----

  @ApiOperation({ summary: 'Danh sách session của sinh viên hiện tại' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('mine')
  async findMine(
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByUser(user.userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({ summary: 'Danh sách session do chính tôi tạo (lecturer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lecturer', 'admin')
  @Get('created-by-me')
  async findMyCreated(
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByCreator(
      user.userId,
    );
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({ summary: 'Danh sách session do 1 giảng viên tạo (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('created-by')
  async findByCreator(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByCreator(userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({ summary: 'Danh sách toàn bộ session' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = user.role === 'admin'
      ? await this.attendanceSessionsService.findAll()
      : await this.attendanceSessionsService.findByCreator(user.userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({ summary: 'Xóa session và toàn bộ dữ liệu điểm danh liên quan' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ): Promise<ApiResponse<null>> {
    await this.attendanceSessionsService.delete(id, user);
    return { success: true, data: null };
  }

  @ApiOperation({ summary: 'Đóng phiên điểm danh sớm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Post(':id/close')
  async close(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse>> {
    const session = await this.attendanceSessionsService.close(id, user);
    return { success: true, data: toAttendanceSessionResponse(session) };
  }

  // ---- 2. CÁC ROUTE CÓ THAM SỐ PHỤ PHỤC VỤ TRUY VẤN ----

  @ApiOperation({ summary: 'Danh sách session theo userId' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('by-user/:userId')
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByUser(userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  // ---- 3. CÁC ROUTE ĐỘNG ':id' ĐẶT Ở CUỐI CÙNG ----

  @ApiOperation({ summary: 'Chi tiết 1 session (kèm danh sách sinh viên)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Get(':id/detail')
  async getDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionDetailResponse>> {
    const detail = await this.attendanceSessionQueryService.getDetail(id, user);
    return {
      success: true,
      data: detail,
    };
  }

  @ApiOperation({ summary: 'Lấy thông tin cơ bản 1 session theo id' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse>> {
    const session = await this.attendanceSessionsService.findByIdForUser(id, user);
    return {
      success: true,
      data: toAttendanceSessionResponse(session),
    };
  }
}