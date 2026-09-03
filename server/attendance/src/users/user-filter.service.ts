import { Injectable } from '@nestjs/common';
import type { UserFilterCriteria } from '@gps-attendance/shared';
import { MOCK_USERS } from './mocks/users.mock';

@Injectable()
export class UserFilterService {
  resolveUserIds(criteria: UserFilterCriteria): number[] {
    const codes = criteria.codeFilter?.addCodes ?? [];

    return MOCK_USERS.filter((user) => codes.includes(user.code)).map(
      (user) => user.id,
    );
  }
}
