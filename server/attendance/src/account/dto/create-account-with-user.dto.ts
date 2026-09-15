// create-account-with-user.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role, ROLES } from '@gps-attendance/shared';

export class CreateAccountWithUserDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  fullname!: string;

  @IsIn(ROLES)
  role!: Role;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}
