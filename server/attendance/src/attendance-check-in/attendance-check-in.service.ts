import { Injectable, BadRequestException, } from '@nestjs/common';
import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { AttendanceValidationService } from '../attendance-validation/attendance-validation.service';
import { CheckInRequestDto } from './attendance-check-in.dto';

@Injectable()
export class AttendanceCheckInService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,
  ) {}

  checkIn(
    dto: CheckInRequestDto,
    userId: number,
  ) {
    // -------------------------------------------------------------------------
    // 1. Resolve session
    // -------------------------------------------------------------------------

    const session = this.attendanceSessionsService.findById(
      dto.sessionId,
    );

    if (session.status !== 'open') {
      throw new BadRequestException(
        'Phiên điểm danh hiện không mở',
      );
    }

    // -------------------------------------------------------------------------
    // 2. Resolve server-side data
    // -------------------------------------------------------------------------

    // TODO: Lấy từ DB khi có AttendanceRecord.
    const existingRecordCount = 0;

    // Không tin timestamp từ client cho thời điểm check-in.
    const checkedInAt = new Date();

    // -------------------------------------------------------------------------
    // 3. Validate
    // -------------------------------------------------------------------------

    return this.attendanceValidationService.validate({
      session,
      userId,
      existingRecordCount,
      checkedInAt,

      location: dto.location,
      device: dto.device,
      integrity: dto.integrity,
    });
  }
}