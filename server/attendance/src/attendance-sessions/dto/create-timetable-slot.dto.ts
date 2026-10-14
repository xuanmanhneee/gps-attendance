import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class CreateTimetableSlotDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  scheduledDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  roomId?: number;
}
