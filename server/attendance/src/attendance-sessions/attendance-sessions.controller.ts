import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { CheckLocationDto } from './dto/check-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GeoService } from '../geo/geo.service';

@ApiTags('attendance-sessions')
@ApiBearerAuth()
@Controller('attendance-sessions')
export class AttendanceSessionsController {
  constructor(
    private readonly sessionsService: AttendanceSessionsService,
    private readonly geoService: GeoService,
  ) {}

  @ApiOperation({ summary: 'Tạo session điểm danh mới (chỉ admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateAttendanceSessionDto, @CurrentUser() user: { userId: number }) {
    return this.sessionsService.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'Danh sách session' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.sessionsService.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết 1 session' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sessionsService.findById(id);
  }

  // Route tạm để test logic GPS độc lập, TRƯỚC KHI có AttendanceRecordModule thật.
  // Sau này bỏ route này đi, logic tương tự sẽ nằm trong AttendanceRecordService.checkIn().
  @ApiOperation({ summary: '[TẠM] Test khoảng cách GPS tới session, chưa ghi record' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/check-location')
  checkLocation(@Param('id', ParseIntPipe) id: number, @Body() dto: CheckLocationDto) {
    const session = this.sessionsService.findById(id);

    const distance = this.geoService.getDistanceInMeters(
      session.latitude,
      session.longitude,
      dto.latitude,
      dto.longitude,
    );

    const withinRadius = distance <= session.radius;

    return {
      sessionId: session.id,
      sessionStatus: session.status,
      distanceMeters: Math.round(distance),
      allowedRadiusMeters: session.radius,
      withinRadius,
    };
  }
}