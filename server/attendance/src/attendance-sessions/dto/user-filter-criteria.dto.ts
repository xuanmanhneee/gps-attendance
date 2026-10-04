import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UnitFilterStepDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  include?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  exclude?: number[];
}

export class TagFilterStepDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  include?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  exclude?: number[];
}

export class CodeFilterStepDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Tương thích với payload cũ đang dùng addCodes.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addCodes?: string[];

  @ApiPropertyOptional({ type: [String] })
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
