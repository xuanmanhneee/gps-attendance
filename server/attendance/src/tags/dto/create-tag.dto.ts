// dto/create-tag.dto.ts
import { IsString, IsInt, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(100)
  name!: string;
}
