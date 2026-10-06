import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class ImportSectionRosterDto {
  @ApiProperty({
    type: [String],
    example: ['2312686', '2312716'],
    description: 'Danh sách mã sinh viên đã có tài khoản trong hệ thống',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  studentCodes!: string[];
}