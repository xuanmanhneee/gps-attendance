// users/user-filter.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { AttendanceSessionErrorCode, type UserFilterCriteria } from '@gps-attendance/shared';

import { UsersService } from './users.service';
import { TagService } from '../tags/tag.service';
import { UnitService } from '#units/units.service';

@Injectable()
export class UserFilterService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tagService: TagService,
    private readonly unitService: UnitService,
  ) {}

  /**
   * Tag là dữ liệu cá nhân: chỉ được dùng tag do chính mình tạo.
   * Kiểm tra cả include lẫn exclude, vì exclude cũng làm lộ thành viên
   * của tag (danh sách kết quả thu hẹp lại).
   */
  async assertTagsOwnedBy(
    criteria: UserFilterCriteria,
    ownerId: number,
  ): Promise<void> {
    const tagIds = [
      ...new Set([
        ...(criteria.tagFilter?.include ?? []),
        ...(criteria.tagFilter?.exclude ?? []),
      ]),
    ];

    if (tagIds.length === 0) {
      return;
    }

    const ownedTags = await this.tagService.findByOwner(ownerId);
    const ownedIds = new Set(ownedTags.map((tag) => tag.id));

    if (!tagIds.every((id) => ownedIds.has(id))) {
      // Cố ý dùng một thông báo chung cho cả "không tồn tại" và "của người
      // khác", không nêu id nào sai, để không lộ id nào có thật.
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TAG,
        message: 'Tag không hợp lệ',
      });
    }
  }

  async resolveUserIds(criteria: UserFilterCriteria): Promise<number[]> {
    const result = new Set<number>();

    // Include: Unit
    if (criteria.unitFilter) {
      const unitIds = await this.resolveUnitFilter(criteria.unitFilter);
      const users = await this.usersService.findByUnitIds(unitIds);

      users.forEach((user) => result.add(user.id));
    }

    // Include: Tag
    if (criteria.tagFilter?.include.length) {
      const userIds = await this.resolveTags(criteria.tagFilter.include);

      userIds.forEach((id) => result.add(id));
    }

    // Include: Code
    if (criteria.codeFilter?.include?.length) {
      const userIds = await this.resolveCodes(criteria.codeFilter.include);

      userIds.forEach((id) => result.add(id));
    }

    // Exclude: Unit
    if (criteria.unitFilter?.exclude.length) {
      const unitIds = await this.resolveUnitLeafIds(
        criteria.unitFilter.exclude,
      );

      const users = await this.usersService.findByUnitIds(unitIds);

      users.forEach((user) => result.delete(user.id));
    }

    // Exclude: Tag
    if (criteria.tagFilter?.exclude.length) {
      const userIds = await this.resolveTags(criteria.tagFilter.exclude);

      userIds.forEach((id) => result.delete(id));
    }

    // Exclude: Code
    if (criteria.codeFilter?.exclude?.length) {
      const userIds = await this.resolveCodes(criteria.codeFilter.exclude);

      userIds.forEach((id) => result.delete(id));
    }

    return Array.from(result);
  }

  private async resolveTags(tagIds: number[]): Promise<number[]> {
    const userIdsPerTag = await Promise.all(
      tagIds.map((tagId) => this.tagService.findUserIdsByTag(tagId)),
    );

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

  private async resolveUnitFilter(
    unitFilter: NonNullable<UserFilterCriteria['unitFilter']>,
  ): Promise<number[]> {
    const includedLeafIds = new Set(
      await this.resolveUnitLeafIds(unitFilter.include),
    );

    const excludedLeafIds = await this.resolveUnitLeafIds(unitFilter.exclude);

    excludedLeafIds.forEach((id) => includedLeafIds.delete(id));

    return Array.from(includedLeafIds);
  }

  private async resolveUnitLeafIds(unitIds: number[]): Promise<number[]> {
    if (!unitIds.length) {
      return [];
    }

    const forest = await this.unitService.getForest();
    const leafIds = new Set<number>();

    for (const unitId of unitIds) {
      const node = forest.find(unitId);

      if (!node) {
        continue;
      }

      node.getLeafIds().forEach((id) => leafIds.add(id));
    }

    return Array.from(leafIds);
  }
}
