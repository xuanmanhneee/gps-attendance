import { BadRequestException } from '@nestjs/common';

import { AttendanceCheckInService } from './attendance-check-in.service';

describe('AttendanceCheckInService', () => {
  it('rejects stale GPS timestamps before reading attempts or records', async () => {
    const now = Date.now();
    const sessionsService = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        latitude: 11.95,
        longitude: 108.44,
        radius: 50,
        openAt: new Date(now - 60_000),
        closeAt: new Date(now + 60_000),
        status: 'open',
      }),
    };
    const validationService = {
      distanceToCenter: jest.fn(),
      validate: jest.fn(),
    };
    const recordsService = { getBySessionAndUser: jest.fn() };
    const attemptCheck = { evaluate: jest.fn() };
    const service = new AttendanceCheckInService(
      sessionsService as any,
      validationService as any,
      recordsService as any,
      attemptCheck as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.checkIn(
        {
          sessionId: 1,
          location: {
            latitude: 11.95,
            longitude: 108.44,
            accuracy: 10,
            timestamp: now - 180_000,
            isMockLocation: false,
          },
          device: { deviceId: 'device-01', platform: 'android', model: 'Pixel' },
          integrity: { integrityToken: null },
        } as any,
        8,
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'ATTENDANCE_CHECK_IN_INVALID_LOCATION_TIMESTAMP',
      },
    });

    expect(attemptCheck.evaluate).not.toHaveBeenCalled();
    expect(recordsService.getBySessionAndUser).not.toHaveBeenCalled();
    expect(validationService.validate).not.toHaveBeenCalled();
  });

  it('rejects check-in when the session is outside its scheduled open/close window', async () => {
    const expiredSession = {
      id: 1,
      title: 'Lập trình Web',
      latitude: 11.95,
      longitude: 108.44,
      radius: 50,
      openAt: new Date(Date.now() - 90_000),
      closeAt: new Date(Date.now() - 10_000),
      status: 'open',
      createdBy: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sessionsService = {
      findById: jest.fn().mockResolvedValue(expiredSession),
    };

    const validationService = {
      distanceToCenter: jest.fn(),
      validate: jest.fn(),
    };

    const recordsService = {
      getBySessionAndUser: jest.fn(),
      markPresent: jest.fn(),
    };

    const attemptCheck = {
      evaluate: jest.fn(),
    };

    const deviceCheck = {
      evaluate: jest.fn(),
    };

    const deviceUsageRepository = {
      isUsed: jest.fn(),
      markUsed: jest.fn(),
    };

    const attemptRepository = {
      completeAttempt: jest.fn(),
      createAttempt: jest.fn(),
      getAttemptCount: jest.fn(),
      resetAttempts: jest.fn(),
    };

    const service = new AttendanceCheckInService(
      sessionsService as any,
      validationService as any,
      recordsService as any,
      attemptCheck as any,
      deviceCheck as any,
      deviceUsageRepository as any,
      attemptRepository as any,
      {} as any,
    );

    const dto = {
      sessionId: 1,
      location: {
        latitude: 11.95,
        longitude: 108.44,
        accuracy: 10,
        timestamp: Date.now(),
        isMockLocation: false,
      },
      device: {
        deviceId: 'device-01',
        platform: 'android',
        model: 'Pixel',
      },
      integrity: {
        integrityToken: 'valid-token',
      },
    } as any;

    await expect(service.checkIn(dto, 8)).rejects.toBeInstanceOf(BadRequestException);
    expect(validationService.distanceToCenter).not.toHaveBeenCalled();
    expect(attemptCheck.evaluate).not.toHaveBeenCalled();
  });
});
