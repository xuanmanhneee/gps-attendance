import { AttemptCheck } from './attempt.check';
import { IAttendanceCheckInAttemptRepository } from '../repositories/attendance-check-in-attempt.repository';

describe('AttemptCheck', () => {
  it('allows attempts up to the third one in a two-minute window', async () => {
    const repository: IAttendanceCheckInAttemptRepository = {
      tryRecordAttempt: jest.fn().mockResolvedValue(true),
    };
    const check = new AttemptCheck(repository);

    await expect(check.evaluate({ sessionId: 3, userId: 7 })).resolves.toEqual({
      isTooMany: false,
    });
    expect(repository.tryRecordAttempt).toHaveBeenCalledWith(3, 7, 3, 120);
  });

  it('rejects the fourth attempt in the active window', async () => {
    const repository: IAttendanceCheckInAttemptRepository = {
      tryRecordAttempt: jest.fn().mockResolvedValue(false),
    };
    const check = new AttemptCheck(repository);

    await expect(check.evaluate({ sessionId: 3, userId: 7 })).resolves.toEqual({
      isTooMany: true,
    });
  });
});
