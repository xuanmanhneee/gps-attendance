import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@gps-attendance/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { LecturerLocationVerificationDto } from './dto/lecturer-location-verification.dto';
import { LecturerLocationVerificationService } from './lecturer-location-verification.service';

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller('v0/attendance-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LecturerLocationVerificationController {
  constructor(
    private readonly verificationService: LecturerLocationVerificationService,
  ) {}

  @ApiOperation({
    summary: 'Ghi nhận GPS giảng viên để xác minh phụ, không đổi tâm session',
  })
  @Roles('organizer', 'admin')
  @Post(':id/lecturer-location-verification')
  async verify(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() dto: LecturerLocationVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<
    ApiResponse<Awaited<ReturnType<LecturerLocationVerificationService['verify']>>>
  > {
    const data = await this.verificationService.verify(
      sessionId,
      user.userId,
      user.role,
      dto,
    );
    return { success: true, data };
  }
}
