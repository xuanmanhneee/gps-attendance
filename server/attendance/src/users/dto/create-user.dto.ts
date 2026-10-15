import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';

import { ROLES, type Role } from '@gps-attendance/shared';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsIn(ROLES)
  role!: Role;

  @IsString()
  @IsNotEmpty()
  fullname!: string;

  @IsInt()
  unitId!: number;
}
