import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBuildingRegistryDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  campusId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsLatitude()
  @Type(() => Number)
  latitude!: number;

  @IsLongitude()
  @Type(() => Number)
  longitude!: number;
}
