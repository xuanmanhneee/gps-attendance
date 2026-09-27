import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsLatitude,
  IsLongitude,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  CheckInRequest,
  Location,
  Device,
  DeviceIntegrity,
} from '@gps-attendance/shared';

// -----------------------------------------------------------------------------
// Location
// -----------------------------------------------------------------------------

export class LocationDto implements Location {
  @ApiProperty({
    description: 'Vĩ độ (decimal degrees)',
    example: 11.9404,
  })
  @IsNumber()
  @IsLatitude()
  latitude!: number;

  @ApiProperty({
    description: 'Kinh độ (decimal degrees)',
    example: 108.4583,
  })
  @IsNumber()
  @IsLongitude()
  longitude!: number;

  @ApiProperty({
    description: 'Độ chính xác GPS, đơn vị mét (sai số, không phải khoảng cách)',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @Max(1000)
  accuracy!: number;

  @ApiProperty({
    description: 'Thời điểm lấy vị trí, epoch milliseconds',
    example: 1755345600000,
  })
  @IsInt()
  timestamp!: number;

  @ApiProperty({
    description: 'Vị trí có được đánh dấu là mock bởi hệ điều hành',
    example: false,
  })
  @IsBoolean()
  isMockLocation!: boolean;
}

// -----------------------------------------------------------------------------
// Device
// -----------------------------------------------------------------------------

export class DeviceDto implements Device {
  @ApiProperty({
    description: 'Installation ID do app tự sinh và lưu trên thiết bị',
    example: 'device-installation-123',
  })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty({
    description: 'Nền tảng thiết bị',
    enum: ['android', 'ios'],
    example: 'android',
  })
  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';

  @ApiProperty({
    description: 'Tên model thiết bị',
    example: 'Pixel 8',
  })
  @IsString()
  @IsNotEmpty()
  model!: string;
}

// -----------------------------------------------------------------------------
// Device integrity
// -----------------------------------------------------------------------------

export class DeviceIntegrityDto implements DeviceIntegrity {
  @ApiProperty({
    description: 'Play Integrity (Android) / App Attest (iOS) token',
    nullable: true,
    example: null,
  })
  @IsString()
  @IsOptional()
  integrityToken!: string | null;
}

// -----------------------------------------------------------------------------
// Check-in
// -----------------------------------------------------------------------------

export class CheckInRequestDto implements CheckInRequest {
  @ApiProperty({
    description: 'Phiên điểm danh',
    example: 1,
  })
  @IsInt()
  sessionId!: number;

  @ApiProperty({
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiProperty({
    type: DeviceDto,
  })
  @ValidateNested()
  @Type(() => DeviceDto)
  device!: DeviceDto;

  @ApiProperty({
    type: DeviceIntegrityDto,
  })
  @ValidateNested()
  @Type(() => DeviceIntegrityDto)
  integrity!: DeviceIntegrityDto;
}
