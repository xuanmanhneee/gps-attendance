// create-account-with-user.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role } from '@gps-attendance/shared';

export class CreateAccountWithUserDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  fullname!: string;

  // Tài khoản admin chỉ được cấp qua seed hoặc thao tác trực tiếp trên server.
  @IsIn(['lecturer', 'student'])
  role!: Role;

  @IsInt()
  unitId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}
