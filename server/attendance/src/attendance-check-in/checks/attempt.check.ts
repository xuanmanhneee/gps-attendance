import { Inject, Injectable } from '@nestjs/common';

import { ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY } from '../attendance-check-in.token';
import { IAttendanceCheckInAttemptRepository } from '../repositories/attendance-check-in-attempt.repository';

@Injectable()
export class AttemptCheck {
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    @Inject(ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: IAttendanceCheckInAttemptRepository,
  ) {}

  async evaluate(input: {
    sessionId: number;
    userId: number;
  }): Promise<{ isTooMany: boolean }> {
    const count = await this.attemptRepository.incrementAttempt(
      input.sessionId,
      input.userId,
    );

    return {
      isTooMany: count > this.MAX_ATTEMPTS,
    };
  }
}
