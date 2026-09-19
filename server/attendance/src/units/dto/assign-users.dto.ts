// server/unit/dto/assign-users.dto.ts
import { IsArray, IsInt } from 'class-validator';
import { AssignUsersRequest } from '@gps-attendance/shared';

export class AssignUsersDto implements Omit<AssignUsersRequest, 'unitId'> {
  @IsArray()
  @IsInt({ each: true })
  userIds!: number[];
}