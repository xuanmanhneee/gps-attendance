import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseSectionDto {
  @ApiProperty({ example: 'CNTT101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  courseCode!: string;

  @ApiProperty({ example: 'Nhập môn Công nghệ thông tin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  courseName!: string;

  @ApiProperty({ example: 'CNTT101-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sectionCode!: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  credits?: number;

  @ApiProperty({ example: '2026-2027' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  semester!: number;

  @ApiProperty({ example: 'Học kỳ 1 năm học 2026-2027' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  termName!: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-01-15' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lecturerId?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @ApiPropertyOptional({ example: 60, minimum: 1, maximum: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  capacity?: number;
}