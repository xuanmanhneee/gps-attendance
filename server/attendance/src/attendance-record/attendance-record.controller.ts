import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiResponse,
  StudentAttendanceHistoryItemDto,
} from '@gps-attendance/shared';
import { AttendanceRecordsService } from './attendance-records.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('attendance-records')
@ApiBearerAuth()
@Controller(['attendance/records', 'v0/attendance/records'])
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
}
