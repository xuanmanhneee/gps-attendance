import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UpdateUnitRequest } from '@gps-attendance/shared';

export class UpdateUnitDto implements UpdateUnitRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  // null nghĩa là chuyển Unit lên làm gốc nên được phép; khác null thì phải
  // là id nguyên dương.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsInt()
  @IsPositive()
  parentId?: number | null;
}
