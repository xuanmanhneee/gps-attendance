import { AttendanceRecordsService } from './attendance-records.service';
import { StudentAttendanceHistoryItemDto } from '@gps-attendance/shared';

describe('AttendanceRecordsService.getMySummary', () => {
  it('tính toán thống kê chuyên cần của sinh viên theo lịch sử điểm danh', async () => {
    const mockRepository = {
      findDetailedHistoryByUser: jest.fn().mockResolvedValue([
        {
          id: 1,
          sessionId: 101,
          sessionTitle: 'Buổi 1',
          sessionStatus: 'closed',
          openAt: '2026-01-01T08:00:00.000Z',
          closeAt: '2026-01-01T09:00:00.000Z',
          radius: 50,
          sessionLatitude: 10.1,
          sessionLongitude: 106.1,
          status: 'present',
          checkedInAt: '2026-01-01T08:11:00.000Z',
          deviceId: 'device-1',
          latitude: 10.1,
          longitude: 106.1,
          accuracy: 12,
          distanceMeters: 8,
        },
        {
          id: 2,
          sessionId: 102,
          sessionTitle: 'Buổi 2',
          sessionStatus: 'closed',
          openAt: '2026-01-02T08:00:00.000Z',
          closeAt: '2026-01-02T09:00:00.000Z',
          radius: 50,
          sessionLatitude: 10.1,
          sessionLongitude: 106.1,
          status: 'late',
          checkedInAt: '2026-01-02T08:22:00.000Z',
          deviceId: 'device-1',
          latitude: 10.1,
          longitude: 106.1,
          accuracy: 10,
          distanceMeters: 12,
        },
        {
          id: 3,
          sessionId: 103,
          sessionTitle: 'Buổi 3',
          sessionStatus: 'closed',
          openAt: '2026-01-03T08:00:00.000Z',
          closeAt: '2026-01-03T09:00:00.000Z',
          radius: 50,
          sessionLatitude: 10.1,
          sessionLongitude: 106.1,
          status: 'absent',
          checkedInAt: null,
          deviceId: null,
          latitude: null,
          longitude: null,
          accuracy: null,
          distanceMeters: null,
        },
        {
          id: 4,
          sessionId: 104,
          sessionTitle: 'Buổi 4',
          sessionStatus: 'closed',
          openAt: '2026-01-04T08:00:00.000Z',
          closeAt: '2026-01-04T09:00:00.000Z',
          radius: 50,
          sessionLatitude: 10.1,
          sessionLongitude: 106.1,
          status: 'excused',
          checkedInAt: null,
          deviceId: null,
          latitude: null,
          longitude: null,
          accuracy: null,
          distanceMeters: null,
        },
      ] as StudentAttendanceHistoryItemDto[]),
    };

    const loggerFactory = {
      create: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      })),
    };

    const service = new AttendanceRecordsService(
      mockRepository as any,
      loggerFactory as any,
    );

    const summary = await service.getMySummary(42);

    expect(summary).toMatchObject({
      totalSessions: 4,
      presentCount: 1,
      lateCount: 1,
      absentCount: 1,
      excusedCount: 1,
      attendanceRate: 75,
    });
  });

  it('không tính buổi sắp diễn ra hoặc bị hủy là vắng mặt', async () => {
    const makeRecord = (
      id: number,
      sessionStatus: StudentAttendanceHistoryItemDto['sessionStatus'],
    ): StudentAttendanceHistoryItemDto => ({
      id,
      sessionId: id,
      sessionTitle: `Buổi ${id}`,
      sessionStatus,
      openAt: '2026-10-04T08:00:00.000Z',
      closeAt: '2026-10-04T09:00:00.000Z',
      radius: 50,
      sessionLatitude: 10.1,
      sessionLongitude: 106.1,
      status: 'absent',
      checkedInAt: null,
      deviceId: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      distanceMeters: null,
    });
    const repository = {
      findDetailedHistoryByUser: jest.fn().mockResolvedValue([
        makeRecord(1, 'closed'),
        makeRecord(2, 'pending'),
        makeRecord(3, 'cancelled'),
      ]),
    };
    const loggerFactory = {
      create: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      })),
    };
    const service = new AttendanceRecordsService(
      repository as any,
      loggerFactory as any,
    );

    const summary = await service.getMySummary(42);

    expect(summary).toMatchObject({
      totalSessions: 3,
      absentCount: 1,
      attendanceRate: 0,
    });
  });
});
