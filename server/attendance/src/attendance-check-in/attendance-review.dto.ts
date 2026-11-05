import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import type {
  AttendanceReviewRequest,
  ResolveAttendanceReviewRequest,
} from '@gps-attendance/shared';

export class AttendanceReviewRequestDto implements AttendanceReviewRequest {
  @ApiProperty({ example: 1 })
  @IsInt()
  sessionId!: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class ResolveAttendanceReviewDto implements ResolveAttendanceReviewRequest {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
