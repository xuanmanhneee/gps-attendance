import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { REVIEW_RESOLUTION_WINDOW_MS } from '../attendance-record/attendance-review.constants';
import { PrismaService } from '../common/database/prisma.service';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { IAttendanceSessionRepository } from './attendance-session.repository';

describe('AttendanceSessionsService flush scheduling', () => {
  it('schedules the Redis flush after the review-resolution window', async () => {
    const closeAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = {
      id: 7,
      title: 'Session test',
      latitude: 10,
      longitude: 106,
      radius: 50,
      openAt: new Date(closeAt.getTime() - 60 * 60 * 1000),
      closeAt,
      status: 'pending',
      createdBy: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      createWithRecords: jest.fn().mockResolvedValue(session),
    };
    const attendanceRecords = {
      initializeBufferForSession: jest.fn().mockResolvedValue(undefined),
    };
    const scheduler = {
      schedule: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn(),
      onJob: jest.fn(),
    };
    const service = new AttendanceSessionsService(
      repository as unknown as IAttendanceSessionRepository,
      attendanceRecords as unknown as AttendanceRecordsService,
      {} as PrismaService,
      scheduler,
    );
    jest.spyOn(service as any, 'resolveSessionContext').mockResolvedValue({
      latitude: 10,
      longitude: 106,
      radius: 50,
      gpsAccuracyThreshold: null,
      lecturerValidationRadius: null,
      buildingId: null,
      roomId: null,
      timetableSlotId: null,
      courseSectionId: null,
      locationSource: 'MANUAL',
      userIds: [42],
    });

    await service.create(
      {
        title: session.title,
        openAt: session.openAt.toISOString(),
        closeAt: closeAt.toISOString(),
      } as any,
      9,
      'organizer',
    );

    expect(scheduler.schedule).toHaveBeenCalledWith(
      'attendance-session.flush',
      new Date(closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS),
      { sessionId: session.id },
      'attendance-session:flush:7',
    );
  });
});
