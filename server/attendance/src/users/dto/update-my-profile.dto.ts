import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMyProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullname!: string;

  @ApiPropertyOptional({ example: 'an.nguyen@example.edu.vn', nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ example: '0123456789', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ example: '2003-12-08', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ example: 'Nam', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string | null;

  @ApiPropertyOptional({ example: 'Đà Lạt, Lâm Đồng', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Khoa học máy tính', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  programName?: string | null;

  @ApiPropertyOptional({ example: 'K66', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cohort?: string | null;

  @ApiPropertyOptional({ example: 'Chính quy', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  studyMode?: string | null;
}
