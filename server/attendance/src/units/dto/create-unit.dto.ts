// server/unit/dto/create-unit.dto.ts
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CreateUnitRequest } from '@gps-attendance/shared';

export class CreateUnitDto implements CreateUnitRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsInt()
  @IsPositive()
  parentId?: number | null;
}
