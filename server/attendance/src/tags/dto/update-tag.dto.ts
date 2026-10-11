// dto/update-tag.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
