import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import type { AttendanceReviewDecision, AttendanceReviewReason } from '@gps-attendance/shared';

export class ReviewAttendanceAttemptDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: AttendanceReviewDecision;

  @ApiProperty({ example: 'Đã đối chiếu với giảng viên tại lớp.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;

  @ApiProperty({
    required: false,
    enum: ['OUTSIDE_GEOFENCE', 'GPS_INACCURATE', 'MOCK_LOCATION', 'DEVICE_ISSUE', 'OTHER'],
  })
  @ValidateIf((dto: ReviewAttendanceAttemptDto) => dto.decision === 'REJECTED')
  @IsIn(['OUTSIDE_GEOFENCE', 'GPS_INACCURATE', 'MOCK_LOCATION', 'DEVICE_ISSUE', 'OTHER'])
  reviewReason?: AttendanceReviewReason;
}
