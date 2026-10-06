import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../common/database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { LecturerLocationVerificationService } from './lecturer-location-verification.service';

describe('LecturerLocationVerificationService', () => {
  const center = { latitude: 11.956531, longitude: 108.444669 };
  const session = {
    id: 9,
    ...center,
    radius: 30,
    lecturerValidationRadius: 25,
    gpsAccuracyThreshold: 15,
    status: 'pending',
    createdBy: 7,
  };
  const prisma = {
    lecturerLocationVerification: {
      create: jest.fn().mockResolvedValue({ id: 44, serverTimestamp: new Date() }),
    },
  };
  const attendanceSessionsService = {
    findByIdForUser: jest.fn().mockResolvedValue(session),
  };
  let service: LecturerLocationVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    attendanceSessionsService.findByIdForUser.mockResolvedValue(session);
    service = new LecturerLocationVerificationService(
      prisma as unknown as PrismaService,
      new GeoService(),
      attendanceSessionsService as unknown as AttendanceSessionsService,
    );
  });

  it('records PASS evidence without changing the session center', async () => {
    const result = await service.verify(9, 7, 'lecturer', {
      ...center,
      accuracy: 5,
      timestamp: new Date().toISOString(),
    });

    expect(result.status).toBe('PASS');
    expect(result.sessionCenterChanged).toBe(false);
    expect(prisma.lecturerLocationVerification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: 9,
        lecturerId: 7,
        status: 'PASS',
      }),
    });
  });

  it('returns WARNING and stores evidence when lecturer GPS is far away', async () => {
    const result = await service.verify(9, 7, 'lecturer', {
      latitude: center.latitude + 0.001,
      longitude: center.longitude,
      accuracy: 5,
      timestamp: new Date().toISOString(),
    });

    expect(result.status).toBe('WARNING');
    expect(result.reasons).toContain('LECTURER_OUTSIDE_EXPECTED_LOCATION');
    expect(result.sessionCenterChanged).toBe(false);
  });

  it('rejects stale lecturer GPS evidence', async () => {
    await expect(
      service.verify(9, 7, 'lecturer', {
        ...center,
        accuracy: 5,
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lecturerLocationVerification.create).not.toHaveBeenCalled();
  });
});
