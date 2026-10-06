import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@gps-attendance/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateDeviceTrustDto } from './dto/update-device-trust.dto';
import { DeviceTrustService } from './device-trust.service';

@ApiTags('device-trust')
@ApiBearerAuth()
@Controller('v0/admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceTrustController {
  constructor(private readonly deviceTrustService: DeviceTrustService) {}

  @ApiOperation({ summary: 'Trust hoặc block một thiết bị đã ghi nhận (admin)' })
  @Roles('admin')
  @Patch(':id/trust')
  async updateTrust(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeviceTrustDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<DeviceTrustService['updateTrust']>>>> {
    const data = await this.deviceTrustService.updateTrust(id, user.userId, dto);
    return { success: true, data };
  }
}
