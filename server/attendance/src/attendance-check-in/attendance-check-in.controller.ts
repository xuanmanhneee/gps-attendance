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
import { ResolveAttendanceReviewDto } from './attendance-review.dto';
import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewHistoryResponse,
} from '@gps-attendance/shared';

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
      'VALID ghi nhận present; REVIEW tạo candidate riêng, giữ record absent và trả reasons; REJECTED không ghi nhận điểm danh.',
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
    summary:
      'Liá»‡t kÃª lá»‹ch sá»­ review do organizer hiá»‡n táº¡i Ä‘Ã£ xá»­ lÃ½',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Get('reviews/history')
  async listMyReviewHistory(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceReviewHistoryResponse[]> {
    return this.attendanceCheckInService.listReviewHistory(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Liệt kê review candidate của phiên (organizer tạo phiên)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Get('sessions/:sessionId/reviews')
  async listReviewCandidates(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceReviewCandidateResponse[]> {
    return this.attendanceCheckInService.listReviewCandidates(
      sessionId,
      user.userId,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Duyệt hoặc từ chối review candidate (organizer tạo phiên)',
    description:
      'Chỉ xử lý từ openAt đến closeAt cộng cửa sổ chốt 10 phút. Quyết định khóa record và được ghi audit log.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('organizer')
  @Patch('sessions/:sessionId/reviews/:userId')
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
