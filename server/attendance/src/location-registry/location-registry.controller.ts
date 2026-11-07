import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@gps-attendance/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LocationRegistryService } from './location-registry.service';
import { CreateBuildingRegistryDto } from './dto/create-building-registry.dto';
import { UpdateBuildingRegistryDto } from './dto/update-building-registry.dto';
import { CreateRegistryRoomDto } from './dto/create-registry-room.dto';
import { UpdateRegistryRoomDto } from './dto/update-registry-room.dto';

@ApiTags('location-registry')
@ApiBearerAuth()
@Controller('v0/location-registry')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationRegistryController {
  constructor(private readonly locationRegistryService: LocationRegistryService) {}

  @ApiOperation({ summary: 'Danh sách khuôn viên trường' })
  @Roles('admin', 'organizer')
  @Get('campuses')
  async listCampuses(): Promise<
    ApiResponse<Awaited<ReturnType<LocationRegistryService['listCampuses']>>>
  > {
    const data = await this.locationRegistryService.listCampuses();
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Danh sách địa điểm trong Location Registry' })
  @Roles('admin', 'organizer')
  @Get('buildings')
  async listBuildings(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<LocationRegistryService['listBuildings']>>>> {
    const data = await this.locationRegistryService.listBuildings(
      includeInactive === 'true',
    );
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Đăng ký tọa độ tòa nhà trong khuôn viên (admin)' })
  @Roles('admin')
  @Post('buildings')
  async createBuilding(
    @Body() dto: CreateBuildingRegistryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<
    ApiResponse<Awaited<ReturnType<LocationRegistryService['createBuilding']>>>
  > {
    const data = await this.locationRegistryService.createBuilding(
      dto,
      user.userId,
    );
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Hiệu chuẩn và xác minh cấu hình địa điểm (admin)' })
  @Roles('admin')
  @Patch('buildings/:id')
  async updateBuilding(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuildingRegistryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<LocationRegistryService['updateBuilding']>>>> {
    const data = await this.locationRegistryService.updateBuilding(
      id,
      dto,
      user.userId,
    );
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Danh sách phòng học và Building đã liên kết' })
  @Roles('admin', 'organizer')
  @Get('rooms')
  async listRooms(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<LocationRegistryService['listRooms']>>>> {
    const data = await this.locationRegistryService.listRooms(
      includeInactive === 'true',
    );
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Tạo phòng và liên kết với BUILDING (admin)' })
  @Roles('admin')
  @Post('rooms')
  async createRoom(
    @Body() dto: CreateRegistryRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<LocationRegistryService['createRoom']>>>> {
    const data = await this.locationRegistryService.createRoom(dto, user.userId);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Cập nhật liên kết phòng–BUILDING (admin)' })
  @Roles('admin')
  @Patch('rooms/:id')
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegistryRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<LocationRegistryService['updateRoom']>>>> {
    const data = await this.locationRegistryService.updateRoom(
      id,
      dto,
      user.userId,
    );
    return { success: true, data };
  }
}
