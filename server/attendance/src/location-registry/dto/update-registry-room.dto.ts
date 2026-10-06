import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class UpdateRegistryRoomDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  buildingId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  floor?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
