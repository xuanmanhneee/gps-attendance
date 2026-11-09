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
  const sessions = {
    findById: jest.fn().mockResolvedValue(openSession),
    findLatestLecturerVerification: jest.fn().mockResolvedValue(null),
  };
  const validation = {
    distanceToCenter: jest.fn().mockReturnValue(0),
    validate: jest.fn().mockReturnValue({ status: 'VALID', reasons: [], distance: 0 }),
  };
  const records = {
    getBySessionAndUser: jest.fn().mockResolvedValue({ status: 'absent' }),
    markPresent: jest.fn().mockResolvedValue(undefined),
  };
  const attemptCheck = {
    evaluate: jest.fn().mockResolvedValue({
      attemptId: 'attempt-10',
      isTooMany: false,
    }),
  };
  const deviceCheck = { evaluate: jest.fn().mockResolvedValue({ isDuplicate: false }) };
  const deviceUsage = { markUsed: jest.fn().mockResolvedValue(undefined) };
  const attemptRepository = {
    completeAttempt: jest.fn().mockResolvedValue(undefined),
    setAttestationResult: jest.fn().mockResolvedValue(undefined),
    getDeviceTrustStatus: jest.fn().mockResolvedValue('UNVERIFIED'),
  };
  const attestation = {
    verify: jest.fn().mockResolvedValue({
      isValid: false,
      verdict: 'TOKEN_MISSING',
      reasons: ['TOKEN_MISSING'],
    }),
  };
  const prisma = {
    registeredDevice: { findUnique: jest.fn() },
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
    attestation as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.findById.mockResolvedValue(openSession);
    sessions.findLatestLecturerVerification.mockResolvedValue(null);
    records.getBySessionAndUser.mockResolvedValue({ status: 'absent' });
    attemptCheck.evaluate.mockResolvedValue({
      attemptId: 'attempt-10',
      isTooMany: false,
    });
    deviceCheck.evaluate.mockResolvedValue({ isDuplicate: false });
    validation.validate.mockReturnValue({ status: 'VALID', reasons: [], distance: 0 });
    attemptRepository.getDeviceTrustStatus.mockResolvedValue('UNVERIFIED');
    attestation.verify.mockResolvedValue({
      isValid: false,
      verdict: 'TOKEN_MISSING',
      reasons: ['TOKEN_MISSING'],
    });
  });

  it('queues platform attestation evidence for an unverified device', async () => {
    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({
      status: 'REVIEW',
      reasons: ['DEVICE_ATTESTATION_FAILED', 'DEVICE_UNVERIFIED'],
    });
    expect(attemptRepository.setAttestationResult).toHaveBeenCalledWith(
      'attempt-10',
      {
        provider: 'PLAY_INTEGRITY',
        verdict: 'TOKEN_MISSING',
        reasons: ['TOKEN_MISSING'],
      },
    );
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(
      'attempt-10',
      'REVIEW',
      ['DEVICE_ATTESTATION_FAILED', 'DEVICE_UNVERIFIED'],
    );
    expect(records.markPresent).toHaveBeenCalledWith(
      expect.objectContaining({
        validationStatus: 'REVIEW',
        reasons: ['DEVICE_ATTESTATION_FAILED', 'DEVICE_UNVERIFIED'],
      }),
    );
  });

  it('rejects a device explicitly blocked by an administrator', async () => {
    attemptRepository.getDeviceTrustStatus.mockResolvedValue('BLOCKED');

    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({ status: 'REJECTED', reasons: ['DEVICE_BLOCKED'] });
    expect(validation.validate).not.toHaveBeenCalled();
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(
      'attempt-10',
      'REJECTED',
      ['DEVICE_BLOCKED'],
    );
  });

  it('does not let a trusted device bypass a failed attestation', async () => {
    attemptRepository.getDeviceTrustStatus.mockResolvedValue('TRUSTED');

    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({
      status: 'REVIEW',
      reasons: ['DEVICE_ATTESTATION_FAILED'],
    });
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(
      'attempt-10',
      'REVIEW',
      ['DEVICE_ATTESTATION_FAILED'],
    );
    expect(records.markPresent).toHaveBeenCalledWith(
      expect.objectContaining({
        validationStatus: 'REVIEW',
        reasons: ['DEVICE_ATTESTATION_FAILED'],
      }),
    );
  });

  it('allows a trusted device when its attestation is verified', async () => {
    attemptRepository.getDeviceTrustStatus.mockResolvedValue('TRUSTED');
    attestation.verify.mockResolvedValue({
      isValid: true,
      verdict: 'PLAY_INTEGRITY_VERIFIED',
      reasons: [],
    });

    const result = await makeService().checkIn(request as never, 31);

    expect(result).toEqual({ status: 'VALID' });
    expect(attemptRepository.completeAttempt).toHaveBeenCalledWith(
      'attempt-10',
      'APPROVED',
      [],
    );
  });
});
