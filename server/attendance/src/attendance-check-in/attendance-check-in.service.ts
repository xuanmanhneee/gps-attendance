import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { AttendanceValidationService } from '../attendance-validation/attendance-validation.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { ATTENDANCE_RECORD_STORE } from '../attendance-record/attendance-record.token';
import { IAttendanceRecordStore } from '../attendance-record/attendance-record.store';

@Injectable()
export class AttendanceCheckInService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceValidationService: AttendanceValidationService,

    @Inject(ATTENDANCE_RECORD_STORE)
    private readonly attendanceRecordStore: IAttendanceRecordStore,
  ) {}

  async checkIn(dto: CheckInRequestDto, userId: number) {
    // -------------------------------------------------------------------------
    // 1. Resolve session
    // -------------------------------------------------------------------------
    const session = await this.attendanceSessionsService.findById(dto.sessionId);

    if (session.status !== 'open') {
      throw new BadRequestException('Phiên điểm danh hiện không mở');
    }

    const existingRecord = await this.attendanceRecordStore.getRecord(
      dto.sessionId,
      userId,
    );

    // -------------------------------------------------------------------------
    // 2. Resolve server-side data
    // -------------------------------------------------------------------------

    // TODO: Lấy từ DB khi có AttendanceRecord.
    const existingRecordCount = existingRecord ? 1 : 0;

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
