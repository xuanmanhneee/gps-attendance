import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
import { UpdateAttendanceSessionDto } from './dto/update-attendance-session.dto';
import { UserFilterCriteria } from '@gps-attendance/shared'; // gộp vào import @gps-attendance/shared có sẵn

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller('/v0/attendance-sessions')
export class AttendanceSessionsController {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceSessionQueryService: AttendanceSessionQueryService,
  ) {}

  @ApiOperation({ summary: 'Tạo session điểm danh mới (organizer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
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

  @ApiOperation({
    summary: 'Huỷ session điểm danh (chỉ organizer tạo ra session đó)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ): Promise<AttendanceSessionResponse> {
    const cancelled = await this.attendanceSessionsService.cancel(
      id,
      user.userId,
    );
    return toAttendanceSessionResponse(cancelled);
  }

  @ApiOperation({ summary: 'Sửa session (chỉ organizer tạo ra session đó)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceSessionDto,
    @CurrentUser() user: { userId: number },
  ): Promise<AttendanceSessionResponse> {
    const updated = await this.attendanceSessionsService.update(
      id,
      dto,
      user.userId,
    );
    return toAttendanceSessionResponse(updated);
  }

  // ---- Các route tĩnh (static path) PHẢI khai báo trước ':id' ----
  // Nest match route theo thứ tự khai báo; nếu ':id' đứng trước,
  // nó sẽ "nuốt" mọi route tĩnh phía sau (vd: me -> id = "me").

  @ApiOperation({ summary: 'Danh sách toàn bộ session' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<AttendanceSessionResponse[]> {
    const sessions = await this.attendanceSessionsService.findAll();
    return sessions.map(toAttendanceSessionResponse);
  }

  @ApiOperation({ summary: 'Danh sách session do chính tôi tạo (organizer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
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
    summary: 'Danh sách session do 1 organizer bất kỳ tạo (chỉ admin)',
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
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AttendanceSessionDetailResponse> {
    return this.attendanceSessionQueryService.getDetail(id);
  }

  @ApiOperation({
    summary:
      'Lấy criteria người tham gia (chỉ organizer tạo, khi roster chưa khởi tạo)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Get(':id/criteria')
  async getCriteria(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ): Promise<{ criteria: UserFilterCriteria | null }> {
    const criteria = await this.attendanceSessionsService.getCriteria(
      id,
      user.userId,
    );
    return { criteria };
  }
}
