// dto/user-filter-criteria.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type {
  UnitFilterStep,
  TagFilterStep,
  CodeFilterStep,
  UserFilterCriteria,
} from '@gps-attendance/shared';

export class UnitFilterStepDto implements UnitFilterStep {
  @ApiPropertyOptional({
    description: 'Chọn Unit và tự kéo theo toàn bộ Unit con.',
    type: [Number],
    example: [11, 12],
  })
  @IsArray()
  @IsInt({ each: true })
  include!: number[];

  @ApiPropertyOptional({
    description: 'Loại bỏ Unit con và toàn bộ subtree của chúng.',
    type: [Number],
    example: [13],
  })
  @IsArray()
  @IsInt({ each: true })
  exclude!: number[];
}

export class TagFilterStepDto implements TagFilterStep {
  @ApiPropertyOptional({
    description: 'Cộng thêm user có các tag này vào tập kết quả.',
    type: [Number],
    example: [1, 2],
  })
  @IsArray()
  @IsInt({ each: true })
  include!: number[];

  @ApiPropertyOptional({
    description: 'Loại bỏ user có các tag này khỏi tập kết quả.',
    type: [Number],
    example: [3],
  })
  @IsArray()
  @IsInt({ each: true })
  exclude!: number[];
}

export class CodeFilterStepDto implements CodeFilterStep {
  @ApiPropertyOptional({
    description: 'Cộng thêm user có các code này vào tập kết quả.',
    type: [String],
    example: ['STU0001', 'STU0002', 'STU0003'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @ApiPropertyOptional({
    description: 'Loại bỏ user có các code này khỏi tập kết quả.',
    type: [String],
    example: ['STU0099'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];
}

export class UserFilterCriteriaDto {
  @ApiPropertyOptional({ type: () => UnitFilterStepDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitFilterStepDto)
  unitFilter?: UnitFilterStepDto;

  @ApiPropertyOptional({ type: () => TagFilterStepDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TagFilterStepDto)
  tagFilter?: TagFilterStepDto;

  @ApiPropertyOptional({ type: () => CodeFilterStepDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CodeFilterStepDto)
  codeFilter?: CodeFilterStepDto;
}
