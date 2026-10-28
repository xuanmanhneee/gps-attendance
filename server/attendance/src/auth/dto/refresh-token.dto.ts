import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { RefreshRequest } from '@gps-attendance/shared';

export class RefreshTokenDto implements RefreshRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refreshToken!: string;
}
