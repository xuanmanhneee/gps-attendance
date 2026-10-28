import { Inject, Injectable } from '@nestjs/common';

import { ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY } from '../attendance-check-in.token';
import { IAttendanceCheckInAttemptRepository } from '../repositories/attendance-check-in-attempt.repository';

@Injectable()
export class AttemptCheck {
  private readonly MAX_ATTEMPTS_PER_WINDOW = 3;
  private readonly ATTEMPT_WINDOW_SECONDS = 2 * 60;

  constructor(
    @Inject(ATTENDANCE_CHECK_IN_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: IAttendanceCheckInAttemptRepository,
  ) {}

  async evaluate(input: {
    sessionId: number;
    userId: number;
  }): Promise<{ isTooMany: boolean }> {
    const accepted = await this.attemptRepository.tryRecordAttempt(
      input.sessionId,
      input.userId,
      this.MAX_ATTEMPTS_PER_WINDOW,
      this.ATTEMPT_WINDOW_SECONDS,
    );

    return {
      isTooMany: !accepted,
    };
  }
}
