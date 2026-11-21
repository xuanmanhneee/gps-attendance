import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type {
  CheckInResponse,
  MyAttendanceSessionResponse,
  UserProfileResponse,
} from '@gps-attendance/shared';
import { IntegrationErrorCode } from '@gps-attendance/shared';

import { AttendanceCheckInService } from '#attendance-check-in/attendance-check-in.service';
import { CheckInRequestDto } from '#attendance-check-in/attendance-check-in.dto';
import { AttendanceSessionQueryService } from '#attendance-sessions/attendance-session-query.service';
import { UsersService } from '#user/users.service';

import { IntegrationApiKeyGuard } from './integration-api-key.guard';

@Controller('v1/integration/mobile')
@UseGuards(IntegrationApiKeyGuard)
export class IntegrationMobileController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: AttendanceSessionQueryService,
    private readonly checkIns: AttendanceCheckInService,
  ) {}

  @Get('users/me')
  async getProfile(
    @Headers('x-user-code') code: string | undefined,
  ): Promise<UserProfileResponse> {
    const user = await this.getParticipant(code);
    return { code: user.code, fullname: user.fullname, role: user.role };
  }

  @Get('attendance-sessions/me')
  async getSessions(
    @Headers('x-user-code') code: string | undefined,
  ): Promise<MyAttendanceSessionResponse[]> {
    const user = await this.getParticipant(code);
    return this.sessions.getMySessions(user.id);
  }

  @Post('attendance/check-in')
  async checkIn(
    @Headers('x-user-code') code: string | undefined,
    @Body() dto: CheckInRequestDto,
  ): Promise<CheckInResponse> {
    const user = await this.getParticipant(code);
    return this.checkIns.checkIn(dto, user.id);
  }

  private async getParticipant(code: string | undefined) {
    const normalized = code?.trim();
    const user =
      normalized && normalized.length <= 50
        ? await this.users.findByCode(normalized)
        : undefined;
    if (!user || user.role !== 'participant') {
      throw new UnauthorizedException({
        code: IntegrationErrorCode.IDENTITY_INVALID,
        message: 'Định danh participant từ hệ thống ngoài không hợp lệ',
      });
    }
    return user;
  }
}
