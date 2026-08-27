import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoginRequest } from '@gps-attendance/shared';

// ! khẳng định với TypeScript rằng property sẽ được khởi tạo trước khi được sử dụng, dù constructor không trực tiếp gán giá trị cho nó.
export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
