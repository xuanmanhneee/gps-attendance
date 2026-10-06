import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsLatitude, IsLongitude, IsNumber, IsPositive } from 'class-validator';

export class LecturerLocationVerificationDto {
  @ApiProperty({ example: 11.956531 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 108.444669 })
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ example: 12, description: 'Sai số GPS tính bằng mét' })
  @IsNumber()
  @IsPositive()
  accuracy!: number;

  @ApiProperty({ example: '2026-10-04T00:00:00.000Z' })
  @IsDateString()
  timestamp!: string;
}
