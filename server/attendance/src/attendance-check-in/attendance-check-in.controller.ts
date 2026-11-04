import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AttendanceCheckInService } from './attendance-check-in.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AttendanceReviewRequestDto,
  ResolveAttendanceReviewDto,
} from './attendance-review.dto';
import type { AttendanceReviewRequestResponse } from '@gps-attendance/shared';

@ApiTags('attendance')
@Controller('v0/attendance')
export class AttendanceCheckInController {
  constructor(
    private readonly attendanceCheckInService: AttendanceCheckInService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Điểm danh bằng vị trí và thiết bị hiện tại',
    description:
      'VALID ghi nhận present; REVIEW giữ absent và trả reasons để người tham gia có thể gửi yêu cầu xác nhận; REJECTED không ghi buffer.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  async checkIn(
    @Body() dto: CheckInRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceCheckInService.checkIn(dto, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gửi yêu cầu xác nhận điểm danh (participant)',
    description:
      'Chỉ hợp lệ sau khi check-in trả REVIEW. reasons do server giữ trong buffer, client chỉ được gửi note tùy chọn.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('participant')
  @Post('review-requests')
  async requestReview(
    @Body() dto: AttendanceReviewRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.attendanceCheckInService.requestReview(
      dto.sessionId,
      user.userId,
      dto.note,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Liệt kê yêu cầu review của phiên (organizer tạo phiên)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Get('sessions/:sessionId/review-requests')
  async listReviewRequests(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceReviewRequestResponse[]> {
    return this.attendanceCheckInService.listReviewRequests(
      sessionId,
      user.userId,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Duyệt hoặc từ chối yêu cầu review (organizer tạo phiên)',
    description:
      'Chỉ xử lý từ openAt đến closeAt cộng cửa sổ chốt 10 phút. Quyết định khóa record và được ghi audit log.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Patch('sessions/:sessionId/review-requests/:userId')
  async resolveReview(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ResolveAttendanceReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.attendanceCheckInService.resolveReview(
      sessionId,
      userId,
      dto.decision,
      user.userId,
      dto.reason,
    );
  }
}
