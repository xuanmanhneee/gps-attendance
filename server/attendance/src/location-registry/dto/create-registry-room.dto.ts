import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsPositive, MaxLength } from 'class-validator';

export class CreateRegistryRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  buildingId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  floor?: string;
}
