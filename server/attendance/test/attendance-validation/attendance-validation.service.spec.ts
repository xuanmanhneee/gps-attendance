import { AttendanceValidationService } from '../../src/attendance-validation/attendance-validation.service';

const input = {
  session: {
    id: 1,
    title: 'Session',
    latitude: 10,
    longitude: 106,
    radius: 100,
    openAt: new Date('2026-10-25T00:00:00.000Z'),
    closeAt: new Date('2026-10-25T01:00:00.000Z'),
    status: 'open' as const,
    createdBy: 1,
    createdAt: new Date('2026-10-24T00:00:00.000Z'),
    updatedAt: new Date('2026-10-24T00:00:00.000Z'),
  },
  userId: 2,
  checkedInAt: new Date('2026-10-25T00:10:00.000Z'),
  location: {
    latitude: 10,
    longitude: 106,
    accuracy: 5,
    timestamp: new Date('2026-10-25T00:09:00.000Z').getTime(),
    isMockLocation: false,
  },
  device: {
    deviceId: 'device-1',
    platform: 'android' as const,
    model: 'Test device',
  },
  integrity: { integrityToken: null },
};

describe('AttendanceValidationService', () => {
  it('rejects an invalid location timestamp before scoring', () => {
    const integrityCheck = { evaluate: jest.fn() };
    const locationCheck = { evaluate: jest.fn() };
    const service = new AttendanceValidationService(
      integrityCheck as never,
      { evaluate: jest.fn().mockReturnValue({ coefficient: 1 }) } as never,
      locationCheck as never,
      { evaluate: jest.fn().mockReturnValue({ isValid: false, ageMs: 60_000 }) } as never,
    );

    expect(service.validate(input)).toEqual({
      status: 'REJECTED',
      reasons: ['INVALID_LOCATION_TIMESTAMP'],
    });
    expect(integrityCheck.evaluate).not.toHaveBeenCalled();
    expect(locationCheck.evaluate).not.toHaveBeenCalled();
  });
});
