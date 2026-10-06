import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { RegistryLocationStatus } from '@prisma/client';

export class UpdateBuildingRegistryDto {
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  geofenceRadius?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  gpsAccuracyThreshold?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  lecturerValidationRadius?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verified?: boolean;

  @IsOptional()
  @IsEnum(RegistryLocationStatus)
  status?: RegistryLocationStatus;
}
