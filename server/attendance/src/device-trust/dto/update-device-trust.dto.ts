import { ApiProperty } from '@nestjs/swagger';
import { DeviceTrustStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeviceTrustDto {
  @ApiProperty({ enum: ['UNVERIFIED', 'TRUSTED', 'BLOCKED'] })
  @IsEnum(DeviceTrustStatus)
  trustStatus!: DeviceTrustStatus;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
