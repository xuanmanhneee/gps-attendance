import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { CheckInRequestDto } from './attendance-check-in.dto';

@Controller('attendance')
export class AttendanceCheckInController {
  constructor(
    private readonly attendanceCheckInService: AttendanceCheckInService,
  ) {}

  @Post('check-in')
  checkIn(@Body() dto: CheckInRequestDto) {
    // TODO: Replace with authenticated user ID.
    const userId = 1;

    return this.attendanceCheckInService.checkIn(dto, userId);
  }
}