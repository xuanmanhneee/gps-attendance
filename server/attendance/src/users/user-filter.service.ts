// users/user-filter.service.ts
import { Injectable, NotImplementedException } from '@nestjs/common';
import type { UserFilterCriteria } from '@gps-attendance/shared';

import { UsersService } from './users.service';
import { TagService } from '../tags/tag.service';

@Injectable()
export class UserFilterService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tagService: TagService,
  ) {}

  async resolveUserIds(criteria: UserFilterCriteria): Promise<number[]> {
    const result = new Set<number>();

    if (criteria.unitFilter) {
      const unitUserIds = await this.resolveUnitFilter(criteria.unitFilter);
      unitUserIds.forEach((id) => result.add(id));
    }

    if (criteria.tagFilter) {
      const tagUserIds = await this.resolveTagFilter(criteria.tagFilter);
      tagUserIds.forEach((id) => result.add(id));
    }

    if (criteria.codeFilter?.addCodes?.length) {
      const codeUserIds = await this.resolveCodes(
        criteria.codeFilter.addCodes,
      );
      codeUserIds.forEach((id) => result.add(id));
    }

    // exclude luôn áp dụng sau cùng, trên toàn bộ tập kết quả đã gộp
    if (criteria.codeFilter?.excludeCodes?.length) {
      const excludeIds = await this.resolveCodes(
        criteria.codeFilter.excludeCodes,
      );
      excludeIds.forEach((id) => result.delete(id));
    }

    return Array.from(result);
  }

  private async resolveTagFilter(
    tagFilter: NonNullable<UserFilterCriteria['tagFilter']>,
  ): Promise<number[]> {
    if (!tagFilter.tagIds?.length) {
      return [];
    }

    const userIdsPerTag = await Promise.all(
      tagFilter.tagIds.map((tagId) =>
        this.tagService.findUserIdsByTag(tagId),
      ),
    );

    // union, dedup tự nhiên nhờ Set ở resolveUserIds
    return userIdsPerTag.flat();
  }

  private async resolveCodes(codes: string[]): Promise<number[]> {
    const users = await Promise.all(
      codes.map((code) => this.usersService.findByCode(code)),
    );

    return users
      .filter((user): user is NonNullable<typeof user> => user != null)
      .map((user) => user.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async resolveUnitFilter(
    unitFilter: NonNullable<UserFilterCriteria['unitFilter']>,
  ): Promise<number[]> {
    // TODO: cần UnitService/UnitRepository để:
    // 1. Expand includedUnitIds -> toàn bộ unit con (đệ quy theo cây unit)
    // 2. Expand excludedUnitIds -> toàn bộ unit con của nó, validate là con của includedUnitIds
    // 3. Lấy userIds thuộc (included units) - (excluded units)
    throw new NotImplementedException(
      'unitFilter chưa được hỗ trợ, cần UnitService trước khi triển khai',
    );
  }
}