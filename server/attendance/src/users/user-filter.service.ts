import { Injectable } from '@nestjs/common';
import type { UserFilterCriteria } from '@gps-attendance/shared';
import { UsersService } from './users.service';
import { TagService } from '../tags/tag.service';
import { UnitService } from '../units/units.service';

@Injectable()
export class UserFilterService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tagService: TagService,
    private readonly unitService: UnitService,
  ) {}


  async resolveUserIds(criteria?: UserFilterCriteria | any): Promise<number[]> {
    if (!criteria) {
      const allUsers = await this.usersService.findAll();
      return allUsers.filter((u) => u.role === 'participant').map((u) => u.id);
    }

    const result = new Set<number>();

    // Support legacy addCodes
    const legacyCodes: string[] = criteria?.codeFilter?.addCodes ?? [];
    if (legacyCodes.some((c) => c.toUpperCase() === 'ALL')) {
      const allUsers = await this.usersService.findAll();
      return allUsers.filter((u) => u.role === 'participant').map((u) => u.id);
    }

    if (legacyCodes.length > 0) {
      const userIds = await this.resolveCodes(legacyCodes);
      userIds.forEach((id) => result.add(id));
    }

    // Include: Unit
    if (criteria.unitFilter && criteria.unitFilter.include?.length) {
      const unitIds = await this.resolveUnitFilter(criteria.unitFilter);
      const users = await this.usersService.findByUnitIds(unitIds);
      users.forEach((user) => result.add(user.id));
    }

    // Include: Tag
    if (criteria.tagFilter?.include?.length) {
      const userIds = await this.resolveTags(criteria.tagFilter.include);
      userIds.forEach((id) => result.add(id));
    }

    // Include: Code
    if (criteria.codeFilter?.include?.length) {
      const userIds = await this.resolveCodes(criteria.codeFilter.include);
      userIds.forEach((id) => result.add(id));
    }

    // Exclude: Unit
    if (criteria.unitFilter?.exclude?.length) {
      const unitIds = await this.resolveUnitLeafIds(criteria.unitFilter.exclude);
      const users = await this.usersService.findByUnitIds(unitIds);
      users.forEach((user) => result.delete(user.id));
    }

    // Exclude: Tag
    if (criteria.tagFilter?.exclude?.length) {
      const userIds = await this.resolveTags(criteria.tagFilter.exclude);
      userIds.forEach((id) => result.delete(id));
    }

    // Exclude: Code
    if (criteria.codeFilter?.exclude?.length) {
      const userIds = await this.resolveCodes(criteria.codeFilter.exclude);
      userIds.forEach((id) => result.delete(id));
    }

    if (result.size === 0 && (!criteria.codeFilter && !criteria.tagFilter && !criteria.unitFilter)) {
      const allUsers = await this.usersService.findAll();
      return allUsers.filter((u) => u.role === 'participant').map((u) => u.id);
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
      codes.map((code) => this.usersService.findByCode(code.trim())),
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
    if (!unitIds || !unitIds.length) {
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
