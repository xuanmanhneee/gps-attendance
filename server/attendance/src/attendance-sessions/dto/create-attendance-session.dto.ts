import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateAttendanceSessionRequest } from '@gps-attendance/shared';
import { UserFilterCriteriaDto } from './user-filter-criteria.dto';

export class CreateAttendanceSessionDto implements CreateAttendanceSessionRequest {
  @ApiProperty({ example: 'Điểm danh buổi sáng - Lớp CNTT K20' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 21.028511 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 105.804817 })
  @IsLongitude()
  longitude!: number;

  @ApiProperty({
    example: 50,
    description: 'Bán kính hợp lệ, đơn vị mét',
  })
  @IsNumber()
  @IsPositive()
  radius!: number;

  @ApiProperty({ example: '2026-08-16T07:00:00.000Z' })
  @IsDateString()
  openAt!: string;

  @ApiProperty({ example: '2026-08-16T07:15:00.000Z' })
  @IsDateString()
  closeAt!: string;

  @ApiProperty({
    type: () => UserFilterCriteriaDto,
    example: {
      codeFilter: {
        addCodes: ['2312686', '2312682', '2312716'],
      },
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UserFilterCriteriaDto)
  participantCriteria!: CreateAttendanceSessionRequest['participantCriteria'];
}
