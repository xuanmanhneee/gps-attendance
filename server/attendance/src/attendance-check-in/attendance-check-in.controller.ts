import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse, AttendanceCheckInResult } from '@gps-attendance/shared';

@ApiTags('attendance-check-in')
@ApiBearerAuth()
@Controller(['attendance', 'v0/attendance'])
export class AttendanceCheckInController {
  constructor(
    private readonly attendanceCheckInService: AttendanceCheckInService,
  ) {}

  @ApiOperation({ summary: 'Sinh viên thực hiện điểm danh (Check-in GPS)' })
  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  async checkIn(
    @Body() dto: CheckInRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<AttendanceCheckInResult>> {
    const result = await this.attendanceCheckInService.checkIn(
      dto,
      user.userId,
    );
    return {
      success: true,
      data: result,
    };
  }
}
