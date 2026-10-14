import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../common/database/prisma.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import type { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { AttendanceSessionsService } from './attendance-sessions.service';

const createRegistrySection = (overrides: Record<string, unknown> = {}) => ({
  id: 41,
  lecturerId: 7,
  room: {
    id: 12,
    status: 'ACTIVE',
    registryBuilding: {
      id: 5,
      code: 'A24',
      type: 'BUILDING',
      status: 'ACTIVE',
      verified: true,
      latitude: 11.956531,
      longitude: 108.444669,
      geofenceRadius: 30,
      gpsAccuracyThreshold: 20,
    },
  },
  timetable: [{
    id: 8,
    scheduledDate: null,
    dayOfWeek: (() => {
      const weekday = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(Date.now() + 60_000));
      return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 })[weekday];
    })(),
    startMinute: 0,
    endMinute: 1440,
    room: null,
  }],
  enrollments: [{ userId: 101 }, { userId: 102 }],
  ...overrides,
});

describe('AttendanceSessionsService registry-backed creation', () => {
  const now = Date.now();
  const repository = {
    createWithRecords: jest.fn().mockImplementation(async (input, userIds) => ({
      id: 99,
      ...input,
      status: 'pending',
      userIds,
    })),
  };
  const prisma = {
    courseSection: { findUnique: jest.fn() },
  };
  let service: AttendanceSessionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.courseSection.findUnique.mockResolvedValue(createRegistrySection());
    service = new AttendanceSessionsService(
      repository as never,
      {} as AttendanceRecordsService,
      prisma as unknown as PrismaService,
    );
  });

  const dto = (): CreateAttendanceSessionDto => ({
    title: 'Attendance test',
    latitude: 10,
    longitude: 106,
    radius: 500,
    openAt: new Date(now + 60_000).toISOString(),
    closeAt: new Date(now + 3_600_000).toISOString(),
    courseSectionId: 41,
    timetableSlotId: 8,
    participantCriteria: { codeFilter: { addCodes: ['UNTRUSTED-CLIENT-LIST'] } },
  }) as CreateAttendanceSessionDto;

  it('snapshots the building center and assigns active enrollments instead of client coordinates', async () => {
    await service.create(dto(), 7, 'lecturer');

    expect(repository.createWithRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 11.956531,
        longitude: 108.444669,
        radius: 30,
        gpsAccuracyThreshold: 20,
        buildingId: 5,
        roomId: 12,
        courseSectionId: 41,
        locationSource: 'BUILDING_REGISTRY',
      }),
      [101, 102],
    );
  });

  it('accepts a session on the selected one-time timetable date', async () => {
    prisma.courseSection.findUnique.mockResolvedValue(
      createRegistrySection({
        timetable: [{
          id: 8,
          dayOfWeek: 3,
          scheduledDate: new Date('2026-10-14T00:00:00.000Z'),
          startMinute: 480,
          endMinute: 540,
          room: null,
        }],
      }),
    );

    await service.create(
      {
        ...dto(),
        openAt: '2026-10-14T02:00:00.000Z',
        closeAt: '2026-10-14T03:00:00.000Z',
      },
      7,
      'lecturer',
    );

    expect(repository.createWithRecords).toHaveBeenCalled();
  });

  it('rejects a session whose date differs from the one-time timetable date', async () => {
    prisma.courseSection.findUnique.mockResolvedValue(
      createRegistrySection({
        timetable: [{
          id: 8,
          dayOfWeek: 3,
          scheduledDate: new Date('2026-10-14T00:00:00.000Z'),
          startMinute: 480,
          endMinute: 540,
          room: null,
        }],
      }),
    );

    await expect(
      service.create(
        {
          ...dto(),
          openAt: '2026-10-15T02:00:00.000Z',
          closeAt: '2026-10-15T03:00:00.000Z',
        },
        7,
        'lecturer',
      ),
    ).rejects.toThrow('Ngày mở session không khớp ngày cụ thể');
    expect(repository.createWithRecords).not.toHaveBeenCalled();
  });

  it('rejects a lecturer who is not assigned to the selected section', async () => {
    prisma.courseSection.findUnique.mockResolvedValue(
      createRegistrySection({ lecturerId: 8 }),
    );

    await expect(service.create(dto(), 7, 'lecturer')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.createWithRecords).not.toHaveBeenCalled();
  });

  it('rejects unverified buildings instead of accepting client-supplied coordinates', async () => {
    prisma.courseSection.findUnique.mockResolvedValue(
      createRegistrySection({
        room: {
          id: 12,
          status: 'ACTIVE',
          registryBuilding: {
            id: 5,
            type: 'BUILDING',
            status: 'ACTIVE',
            verified: false,
            latitude: 11.956531,
            longitude: 108.444669,
            geofenceRadius: null,
            gpsAccuracyThreshold: null,
          },
        },
      }),
    );

    await expect(service.create(dto(), 7, 'lecturer')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.createWithRecords).not.toHaveBeenCalled();
  });

  it('rejects creating a session when the section has no active enrollments', async () => {
    prisma.courseSection.findUnique.mockResolvedValue(
      createRegistrySection({ enrollments: [] }),
    );

    await expect(service.create(dto(), 7, 'lecturer')).rejects.toThrow(
      'Lớp học phần chưa có sinh viên ghi danh active',
    );
    expect(repository.createWithRecords).not.toHaveBeenCalled();
  });

  it('rejects creating a session when the section has no timetable', async () => {
    prisma.courseSection.findUnique.mockResolvedValue(
      createRegistrySection({ timetable: [] }),
    );

    await expect(service.create(dto(), 7, 'lecturer')).rejects.toThrow(
      'Lớp học phần chưa có thời khóa biểu',
    );
    expect(repository.createWithRecords).not.toHaveBeenCalled();
  });

  it('rejects manually supplied coordinates so new sessions must use the location registry', async () => {
    await expect(
      service.create(
        {
          ...dto(),
          courseSectionId: undefined,
          timetableSlotId: undefined,
        },
        1,
        'admin',
      ),
    ).rejects.toThrow(
      'Session phải được tạo từ lớp học phần có phòng liên kết với Building đã xác minh trong Location Registry',
    );

    expect(repository.createWithRecords).not.toHaveBeenCalled();
  });
});
