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
<<<<<<< HEAD
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
=======
import { toAttendanceSessionResponse } from './attendance-session.mapper';
import {
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller(['attendance-sessions', 'v0/attendance-sessions'])
export class AttendanceSessionsController {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceSessionQueryService: AttendanceSessionQueryService,
  ) {}

  @ApiOperation({ summary: 'Tạo session điểm danh mới (lecturer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lecturer')
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

<<<<<<< HEAD
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
=======
  // ---- Các route tĩnh (static path) PHẢI khai báo trước ':id' ----
  // Nest match route theo thứ tự khai báo; nếu ':id' đứng trước,
  // nó sẽ "nuốt" mọi route tĩnh phía sau (vd: me -> id = "me").

  @ApiOperation({ summary: 'Danh sách toàn bộ session' })
  @UseGuards(JwtAuthGuard)
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = user.role === 'admin'
      ? await this.attendanceSessionsService.findAll()
      : await this.attendanceSessionsService.findByCreator(user.userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

<<<<<<< HEAD
  @ApiOperation({ summary: 'Xóa session và toàn bộ dữ liệu điểm danh liên quan' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'lecturer')
  @Delete(':id')
  async delete(
=======
  @ApiOperation({ summary: 'Danh sách session do chính tôi tạo (lecturer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lecturer')
  @Get('created-by-me')
  async findMyCreated(
    @CurrentUser() user: { userId: number },
  ): Promise<AttendanceSessionResponse[]> {
    const sessions = await this.attendanceSessionsService.findByCreator(
      user.userId,
    );
    return sessions.map(toAttendanceSessionResponse);
  }

  @ApiOperation({
    summary: 'Danh sách session do 1 lecturer bất kỳ tạo (chỉ admin)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('created-by')
  async findByCreator(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<AttendanceSessionResponse[]> {
    const sessions = await this.attendanceSessionsService.findByCreator(userId);
    return sessions.map(toAttendanceSessionResponse); 
  }

  @ApiOperation({
    summary: 'Danh sách session sinh viên tham gia kèm trạng thái điểm danh',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySessions(
    @CurrentUser() user: { userId: number },
  ): Promise<MyAttendanceSessionResponse[]> {
    return this.attendanceSessionQueryService.getMySessions(user.userId);
  }

  // ---- ':id' luôn đặt CUỐI CÙNG trong nhóm GET ----

  @ApiOperation({ summary: 'Chi tiết 1 session' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getDetail(
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ): Promise<ApiResponse<null>> {
    await this.attendanceSessionsService.delete(id, user);
    return { success: true, data: null };
  }
<<<<<<< HEAD

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
=======
}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
