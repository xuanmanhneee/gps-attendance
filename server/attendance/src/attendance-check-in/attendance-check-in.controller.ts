import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse, AttendanceCheckInResult } from '@gps-attendance/shared';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

<<<<<<< HEAD
@ApiTags('attendance-check-in')
@ApiBearerAuth()
@Controller(['attendance', 'v0/attendance'])
=======
@Controller('v0/attendance')
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
export class AttendanceCheckInController {
  constructor(
    private readonly attendanceCheckInService: AttendanceCheckInService,
  ) {}

  @ApiOperation({ summary: 'Sinh viên thực hiện điểm danh (Check-in GPS)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
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
