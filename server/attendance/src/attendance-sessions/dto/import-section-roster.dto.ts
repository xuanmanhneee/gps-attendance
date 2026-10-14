import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportSectionStudentDto {
  @IsString()
  @MaxLength(50)
  studentCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cohort?: string;
}

export class ImportSectionRosterDto {
  @ApiProperty({
    type: [String],
    example: ['2312686', '2312716'],
    required: false,
    description: 'Tương thích ngược: danh sách mã sinh viên đã có tài khoản',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  studentCodes?: string[];

  @ApiProperty({
    type: [ImportSectionStudentDto],
    required: false,
    description: 'Hồ sơ roster; mật khẩu tài khoản sinh viên được đặt theo mã sinh viên',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ImportSectionStudentDto)
  students?: ImportSectionStudentDto[];
}