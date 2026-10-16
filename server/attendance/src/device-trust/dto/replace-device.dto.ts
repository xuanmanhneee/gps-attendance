import { ApiProperty } from '@nestjs/swagger';
import { DeviceTrustStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReplaceDeviceDto {
  @ApiProperty({ required: false, description: 'Mã định danh thiết bị mới (nếu có)' })
  @IsOptional()
  @IsString()
  newDeviceId?: string;

  @ApiProperty({ required: false, description: 'Model điện thoại mới (ví dụ: iPhone 15 Pro, Galaxy S24...)' })
  @IsOptional()
  @IsString()
  newModel?: string;

  @ApiProperty({ required: false, description: 'Hệ điều hành mới (android / ios)' })
  @IsOptional()
  @IsString()
  newPlatform?: string;

  @ApiProperty({ enum: ['UNVERIFIED', 'TRUSTED', 'BLOCKED'], required: false, default: 'TRUSTED' })
  @IsOptional()
  @IsEnum(DeviceTrustStatus)
  trustStatus?: DeviceTrustStatus;

  @ApiProperty({ required: false, maxLength: 500, description: 'Ghi chú lý do đổi thiết bị' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
