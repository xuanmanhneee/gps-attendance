import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class UnitFilterStepDto {
  @IsArray()
  @IsInt({ each: true })
  include!: number[];

  @IsArray()
  @IsInt({ each: true })
  exclude!: number[];
}

export class TagFilterStepDto {
  @IsArray()
  @IsInt({ each: true })
  include!: number[];

  @IsArray()
  @IsInt({ each: true })
  exclude!: number[];
}

export class CodeFilterStepDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];
}

export class UserFilterDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitFilterStepDto)
  unitFilter?: UnitFilterStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TagFilterStepDto)
  tagFilter?: TagFilterStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CodeFilterStepDto)
  codeFilter?: CodeFilterStepDto;
}