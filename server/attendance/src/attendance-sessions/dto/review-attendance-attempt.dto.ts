import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { AttendanceReviewDecision } from '@gps-attendance/shared';

export class ReviewAttendanceAttemptDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: AttendanceReviewDecision;

  @ApiProperty({ example: 'Đã đối chiếu với giảng viên tại lớp.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
