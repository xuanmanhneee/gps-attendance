import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiResponse,
  AttendanceHistoryEventDto,
  StudentAttendanceHistoryItemDto,
  StudentAttendanceSummary,
} from '@gps-attendance/shared';
import { AttendanceRecordsService } from './attendance-records.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('attendance-records')
@ApiBearerAuth()
@Controller('v0/attendance/records')
export class AttendanceRecordController {
  constructor(
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  @ApiOperation({
    summary: 'Lấy lịch sử điểm danh chi tiết của sinh viên hiện tại',
  })
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<StudentAttendanceHistoryItemDto[]>> {
    const records =
      await this.attendanceRecordsService.findDetailedHistoryByUser(user.userId);

    return {
      success: true,
      data: records,
    };
  }

  @ApiOperation({
    summary: 'Lấy tổng quan chuyên cần của sinh viên hiện tại',
  })
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<StudentAttendanceSummary>> {
    const summary = await this.attendanceRecordsService.getMySummary(user.userId);

    return {
      success: true,
      data: summary,
    };
  }

  @ApiOperation({ summary: 'Lấy nhật ký sự kiện điểm danh của sinh viên hiện tại' })
  @UseGuards(JwtAuthGuard)
  @Get('events/mine')
  async findMyHistoryEvents(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceHistoryEventDto[]>> {
    const events = await this.attendanceRecordsService.findHistoryEventsByUser(
      user.userId,
    );
    return { success: true, data: events };
  }

  @ApiOperation({
    summary: 'Lấy chi tiết một bản ghi điểm danh theo ID',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<StudentAttendanceHistoryItemDto>> {
    const record = await this.attendanceRecordsService.findById(id);

    if (!record) {
      throw new NotFoundException({
        code: 'RECORD_NOT_FOUND',
        message: 'Không tìm thấy bản ghi điểm danh',
      });
    }

    if (user.role === 'participant') {
      const userRecord = await this.attendanceRecordsService.getBySessionAndUser(
        record.sessionId,
        user.userId,
      );
      if (!userRecord) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền truy cập bản ghi điểm danh này',
        });
      }
    }

    return {
      success: true,
      data: record,
    };
  }
}
