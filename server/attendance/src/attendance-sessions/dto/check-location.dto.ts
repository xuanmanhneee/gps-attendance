import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude } from 'class-validator';

export class CheckLocationDto {
  @ApiProperty({ example: 21.028511 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 105.804817 })
  @IsLongitude()
  longitude!: number;
}
