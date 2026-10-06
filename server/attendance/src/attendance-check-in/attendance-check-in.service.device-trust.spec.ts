import { AttendanceCheckInService } from './attendance-check-in.service';

const openSession = {
  id: 3,
  title: 'Device trust test',
  latitude: 11.95,
  longitude: 108.44,
  radius: 40,
  openAt: new Date(Date.now() - 60_000),
  closeAt: new Date(Date.now() + 600_000),
  status: 'open',
  createdBy: 7,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const request = {
  sessionId: 3,
  location: {
    latitude: 11.95,
    longitude: 108.44,
    accuracy: 8,
    timestamp: Date.now(),
    isMockLocation: false,
  },
  device: { deviceId: 'install-1', platform: 'android', model: 'Pixel' },
  integrity: { integrityToken: null },
};

describe('AttendanceCheckInService device trust', () => {
  const sessions = { findById: jest.fn().mockResolvedValue(openSession) };
  const validation = {
    distanceToCenter: jest.fn().mockReturnValue(0),
    validate: jest.fn().mockReturnValue({ status: 'VALID', reasons: [], distance: 0 }),
  };
  const records = {
    getBySessionAndUser: jest.fn().mockResolvedValue({ status: 'absent' }),
    markPresent: jest.fn().mockResolvedValue(undefined),
  };
  const attemptCheck = { evaluate: jest.fn().mockResolvedValue({ attemptId: 10, isTooMany: false }) };
  const deviceCheck = { evaluate: jest.fn().mockResolvedValue({ isDuplicate: false }) };
  const deviceUsage = { markUsed: jest.fn().mockResolvedValue(undefined) };
  const attemptRepository = { completeAttempt: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    registeredDevice: { upsert: jest.fn() },
    deviceIntegrityCheck: { create: jest.fn().mockResolvedValue({}) },
  };

  const makeService = () => new AttendanceCheckInService(
    sessions as never,
    validation as never,
    records as never,
    attemptCheck as never,
    deviceCheck as never,
    deviceUsage as never,
    attemptRepository as never,
    prisma as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.findById.mockResolvedValue(openSession);
    records.getBySessionAndUser.mockResolvedValue({ status: 'absent' });
    attemptCheck.evaluate.mockResolvedValue({ attemptId: 10, isTooMany: false });
    deviceCheck.evaluate.mockResolvedValue({ isDuplicate: false });
    validation.validate.mockReturnValue({ status: 'VALID', reasons: [], distance: 0 });
    prisma.deviceIntegrityCheck.create.mockResolvedValue({});
  });

  it('requires review for an unverified device and records missing platform attestation honestly', async () => {
    prisma.registeredDevice.upsert.mockResolvedValue({ id: 22, trustStatus: 'UNVERIFIED' });

    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({ status: 'REVIEW', reasons: ['DEVICE_UNVERIFIED'] });
    expect(prisma.deviceIntegrityCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registeredDeviceId: 22,
        verdict: 'TOKEN_MISSING',
        reasons: ['PLATFORM_ATTESTATION_VALIDATOR_NOT_CONFIGURED'],
      }),
    });
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(
      10,
      'REVIEW',
      ['DEVICE_UNVERIFIED'],
    );
  });

  it('rejects a device explicitly blocked by an administrator', async () => {
    prisma.registeredDevice.upsert.mockResolvedValue({ id: 22, trustStatus: 'BLOCKED' });

    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({ status: 'REJECTED', reasons: ['DEVICE_BLOCKED'] });
    expect(validation.validate).not.toHaveBeenCalled();
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(
      10,
      'REJECTED',
      ['DEVICE_BLOCKED'],
    );
  });

  it('allows a trusted device to follow the existing GPS validation outcome', async () => {
    prisma.registeredDevice.upsert.mockResolvedValue({ id: 22, trustStatus: 'TRUSTED' });

    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({ status: 'VALID' });
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(10, 'APPROVED', []);
  });
});
