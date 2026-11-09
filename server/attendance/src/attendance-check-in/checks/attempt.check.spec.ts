import { AttemptCheck } from './attempt.check';
import { IAttendanceCheckInAttemptRepository } from '../repositories/attendance-check-in-attempt.repository';

describe('AttemptCheck', () => {
  const input = {
    sessionId: 3,
    userId: 7,
    latitude: 10,
    longitude: 106,
    accuracy: 5,
    distanceToCenter: 2,
    deviceId: 'device-7',
    isMockLocation: false,
  };

  it('allows attempts up to the third one in a two-minute window', async () => {
    const repository: IAttendanceCheckInAttemptRepository = {
      createAttempt: jest.fn().mockResolvedValue({ id: 'attempt-1', count: 3 }),
      completeAttempt: jest.fn(),
      getAttemptCount: jest.fn(),
      setAttestationResult: jest.fn(),
      getDeviceTrustStatus: jest.fn(),
    };
    const check = new AttemptCheck(repository);

    await expect(check.evaluate(input)).resolves.toEqual({
      attemptId: 'attempt-1',
      isTooMany: false,
    });
    expect(repository.createAttempt).toHaveBeenCalledWith(input);
  });

  it('rejects the fourth attempt in the active window', async () => {
    const repository: IAttendanceCheckInAttemptRepository = {
      createAttempt: jest.fn().mockResolvedValue({ id: 'attempt-2', count: 4 }),
      completeAttempt: jest.fn(),
      getAttemptCount: jest.fn(),
      setAttestationResult: jest.fn(),
      getDeviceTrustStatus: jest.fn(),
    };
    const check = new AttemptCheck(repository);

    await expect(check.evaluate(input)).resolves.toEqual({
      attemptId: 'attempt-2',
      isTooMany: true,
    });
  });
});
