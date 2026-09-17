import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('v0/attendance')
export class AttendanceCheckInController {
  constructor(
    private readonly attendanceCheckInService: AttendanceCheckInService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  async checkIn(
    @Body() dto: CheckInRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceCheckInService.checkIn(dto, user.userId);
  }
}
