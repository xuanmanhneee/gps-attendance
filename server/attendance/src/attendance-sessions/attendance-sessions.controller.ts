import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionQueryService } from './attendance-session-query.service';
import { toAttendanceSessionResponse } from './attendance-session.mapper';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { ReviewAttendanceAttemptDto } from './dto/review-attendance-attempt.dto';
import { ImportSectionRosterDto } from './dto/import-section-roster.dto';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { ImportCoursesDto } from './dto/import-courses.dto';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller('v0/attendance-sessions')
export class AttendanceSessionsController {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceSessionQueryService: AttendanceSessionQueryService,
  ) {}

  @ApiOperation({ summary: 'Tạo session điểm danh mới (lecturer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer', 'admin')
  @Post()
  async create(
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse>> {
    const session = await this.attendanceSessionsService.create(
      dto,
      user.userId,
      user.role,
    );
    return { success: true, data: toAttendanceSessionResponse(session) };
  }

  // ---- 1. CÁC ROUTE TĨNH (STATIC PATHS) PHẢI KHAI BÁO ĐẦU TIÊN ----

  @ApiOperation({ summary: 'Danh sách session của sinh viên hiện tại' })
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByUser(user.userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({
    summary: 'Danh sách session sinh viên tham gia kèm trạng thái điểm danh',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySessions(
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<MyAttendanceSessionResponse[]>> {
    const data = await this.attendanceSessionQueryService.getMySessions(user.userId);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Danh sách lớp và lịch được giảng viên phụ trách' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer', 'admin')
  @Get('teaching-sections')
  async getTeachingSections(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<AttendanceSessionQueryService['getTeachingSections']>>>> {
    const data = await this.attendanceSessionQueryService.getTeachingSections(
      user.userId,
      user.role === 'admin',
    );
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Danh mục giảng viên và phòng để tạo lớp học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('sections/creation-options')
  async getCourseSectionCreationOptions() {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.getCourseSectionCreationOptions(),
    };
  }

  @ApiOperation({ summary: 'Nhập danh mục mã học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('courses/import')
  async importCourses(@Body() dto: ImportCoursesDto) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.importCourses(dto.courses),
    };
  }

  @ApiOperation({ summary: 'Tạo lớp học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('sections')
  async createCourseSection(@Body() dto: CreateCourseSectionDto) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.createCourseSection(dto),
    };
  }

  @ApiOperation({ summary: 'Danh sách sinh viên đang ghi danh trong lớp học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'organizer')
  @Get('sections/:sectionId/roster')
  async getSectionRoster(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.getSectionRoster(sectionId, user),
    };
  }

  @ApiOperation({ summary: 'Mở rộng sức chứa lớp học phần lên 300 sinh viên (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('sections/:sectionId/capacity')
  async expandCourseSectionCapacity(
    @Param('sectionId', ParseIntPipe) sectionId: number,
  ) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.expandCourseSectionCapacity(sectionId),
    };
  }

  @ApiOperation({ summary: 'Nhập danh sách sinh viên vào lớp học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('sections/:sectionId/roster/import')
  async importSectionRoster(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() dto: ImportSectionRosterDto,
  ) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.importSectionRoster(
        sectionId,
        dto.students ?? dto.studentCodes ?? [],
      ),
    };
  }

  @ApiOperation({ summary: 'Thêm ca học vào thời khóa biểu lớp học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('sections/:sectionId/timetable')
  async createTimetableSlot(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() dto: CreateTimetableSlotDto,
  ) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.createTimetableSlot(
        sectionId,
        dto,
      ),
    };
  }

  @ApiOperation({ summary: 'Cập nhật ca học trong thời khóa biểu lớp học phần (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('sections/:sectionId/timetable/:slotId')
  async updateTimetableSlot(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: UpdateTimetableSlotDto,
  ) {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.updateTimetableSlot(
        sectionId,
        slotId,
        dto,
      ),
    };
  }

  @ApiOperation({ summary: 'Xóa ca học chưa được sử dụng trong phiên điểm danh (admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('sections/:sectionId/timetable/:slotId')
  async deleteTimetableSlot(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
  ) {
    await this.attendanceSessionQueryService.deleteTimetableSlot(
      sectionId,
      slotId,
    );
    return { success: true, data: null };
  }

  @ApiOperation({ summary: 'Danh sách session do chính tôi tạo (lecturer)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer', 'admin')
  @Get('created-by-me')
  async findMyCreated(
    @CurrentUser() user: { userId: number },
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions = await this.attendanceSessionsService.findByCreator(
      user.userId,
    );
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({ summary: 'Thống kê chuyên cần và sinh viên cần quan tâm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer', 'admin')
  @Get('analytics')
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<AttendanceSessionQueryService['getLecturerAnalytics']>>>> {
    return {
      success: true,
      data: await this.attendanceSessionQueryService.getLecturerAnalytics(
        user.userId,
        user.role === 'admin',
      ),
    };
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
  @Roles('admin', 'organizer')
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse[]>> {
    const sessions =
      user.role === 'admin'
        ? await this.attendanceSessionsService.findAll()
        : await this.attendanceSessionsService.findByCreator(user.userId);
    return { success: true, data: sessions.map(toAttendanceSessionResponse) };
  }

  @ApiOperation({ summary: 'Giảng viên duyệt hoặc từ chối lượt điểm danh cần xem xét' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'organizer')
  @Post(':id/attempts/:attemptId/review')
  async reviewAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: ReviewAttendanceAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<null>> {
    await this.attendanceSessionQueryService.reviewAttempt(
      id,
      attemptId,
      user.userId,
      user.role,
      dto.decision,
      dto.note,
      dto.reviewReason,
    );
    return { success: true, data: null };
  }

  @ApiOperation({ summary: 'Xóa session và toàn bộ dữ liệu điểm danh liên quan' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'organizer')
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
  @Roles('admin', 'organizer')
  @Post(':id/close')
  async close(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse>> {
    const session = await this.attendanceSessionsService.close(id, user);
    return { success: true, data: toAttendanceSessionResponse(session) };
  }

  @ApiOperation({ summary: 'Hủy phiên điểm danh chưa kết thúc' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'organizer')
  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceSessionResponse>> {
    const session = await this.attendanceSessionsService.cancel(id, user);
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
  @Roles('admin', 'organizer')
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
  @Roles('admin', 'organizer')
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
