import { BadRequestException } from '@nestjs/common';

import { AttendanceCheckInService } from './attendance-check-in.service';

describe('AttendanceCheckInService', () => {
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
