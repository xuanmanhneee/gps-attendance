import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitErrorCode } from '@gps-attendance/shared';

import IUnitRepository from './unit.repository';
import { CreateUnitInput, Unit, UpdateUnitInput } from './unit.model';
import { UNIT_REPOSITORY } from './unit.repository.token';
import { UnitForest } from './unit-tree.model';

@Injectable()
export class UnitService {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
  ) {}

  findById(id: number): Promise<Unit | null> {
    return this.unitRepository.findById(id);
  }

  findByIds(ids: number[]): Promise<Unit[]> {
    return this.unitRepository.findByIds(ids);
  }

  findByExternalCode(code: string): Promise<Unit | null> {
    return this.unitRepository.findByExternalCode(code);
  }

  findAll(): Promise<Unit[]> {
    return this.unitRepository.findAll();
  }

  /** Dựng cây từ toàn bộ Unit hiện có. */
  async getForest(): Promise<UnitForest> {
    const units = await this.findAll();
    return new UnitForest(units);
  }

  async create(input: CreateUnitInput): Promise<Unit> {
    let parentId: number | null = null;
    let level = 0;

    if (input.parentId !== undefined && input.parentId !== null) {
      const parent = await this.unitRepository.findById(input.parentId);

      if (!parent) {
        throw new NotFoundException({
          code: UnitErrorCode.PARENT_NOT_FOUND,
          message: 'Parent unit not found',
        });
      }

      parentId = parent.id;
      level = parent.level + 1;
    }

    return this.unitRepository.create({
      externalCode: input.externalCode,
      name: input.name,
      parentId,
      level,
    });
  }

  async update(id: number, input: UpdateUnitInput): Promise<Unit> {
    const unit = await this.unitRepository.findById(id);

    if (!unit) {
      throw new NotFoundException({
        code: UnitErrorCode.NOT_FOUND,
        message: 'Unit not found',
      });
    }

    let level = unit.level;

    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        level = 0;
      } else {
        if (input.parentId === id) {
          throw new BadRequestException({
            code: UnitErrorCode.SELF_REFERENCE,
            message: 'Unit cannot be its own parent',
          });
        }

        const parent = await this.unitRepository.findById(input.parentId);

        if (!parent) {
          throw new NotFoundException({
            code: UnitErrorCode.PARENT_NOT_FOUND,
            message: 'Parent unit not found',
          });
        }

        await this.assertNoCycle(id, input.parentId);

        // TODO: Khi hỗ trợ move subtree, cần cập nhật level của descendants.
        level = parent.level + 1;
      }
    }

    return this.unitRepository.update(id, {
      ...(input.externalCode !== undefined && {
        externalCode: input.externalCode,
      }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      level,
    });
  }

  private async assertNoCycle(
    movingId: number,
    candidateParentId: number,
  ): Promise<void> {
    let currentId: number | null = candidateParentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === movingId) {
        throw new BadRequestException({
          code: UnitErrorCode.CYCLE_DETECTED,
          message: 'Cannot move a unit under one of its own descendants',
        });
      }

      if (visited.has(currentId)) {
        throw new ConflictException({
          code: UnitErrorCode.HIERARCHY_CORRUPTED,
          message: 'Existing unit hierarchy contains a cycle',
        });
      }

      visited.add(currentId);

      const current = await this.unitRepository.findById(currentId);
      currentId = current?.parentId ?? null;
    }
  }
}
