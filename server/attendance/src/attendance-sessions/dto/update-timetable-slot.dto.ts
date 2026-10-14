import { Type, Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsDateString({ strict: true })
  scheduledDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsInt()
  @IsPositive()
  roomId?: number | null;
}
