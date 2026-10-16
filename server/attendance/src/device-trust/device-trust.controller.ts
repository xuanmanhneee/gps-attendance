import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@gps-attendance/shared';
import { DeviceTrustStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateDeviceTrustDto } from './dto/update-device-trust.dto';
import { ReplaceDeviceDto } from './dto/replace-device.dto';
import { DeviceTrustService } from './device-trust.service';

@ApiTags('device-trust')
@ApiBearerAuth()
@Controller('v0/admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeviceTrustController {
  constructor(private readonly deviceTrustService: DeviceTrustService) {}

  @ApiOperation({ summary: 'Lấy danh sách thiết bị sinh viên đã đăng ký' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo MSSV, tên SV, mã thiết bị, model' })
  @ApiQuery({ name: 'trustStatus', required: false, enum: DeviceTrustStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('admin', 'lecturer')
  @Get()
  async listDevices(
    @Query('search') search?: string,
    @Query('trustStatus') trustStatus?: DeviceTrustStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<DeviceTrustService['listDevices']>>>> {
    const data = await this.deviceTrustService.listDevices({
      search,
      trustStatus,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Duyệt (Trust) hoặc chặn (Block) thiết bị' })
  @Roles('admin', 'lecturer')
  @Patch(':id/trust')
  async updateTrust(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeviceTrustDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<DeviceTrustService['updateTrust']>>>> {
    const data = await this.deviceTrustService.updateTrust(id, user.userId, dto);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Cập nhật/thay thế thiết bị khi sinh viên đổi điện thoại mới' })
  @Roles('admin', 'lecturer')
  @Post(':id/replace')
  async replaceDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<DeviceTrustService['replaceDevice']>>>> {
    const data = await this.deviceTrustService.replaceDevice(id, user.userId, dto);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Đặt lại (reset/xóa) thiết bị để sinh viên liên kết máy mới' })
  @Roles('admin', 'lecturer')
  @Delete(':id')
  async resetDevice(
    @Param('id', ParseIntPipe) id: number,
    @Query('note') note: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<DeviceTrustService['resetDevice']>>>> {
    const data = await this.deviceTrustService.resetDevice(id, user.userId, note);
    return { success: true, data };
  }
}
