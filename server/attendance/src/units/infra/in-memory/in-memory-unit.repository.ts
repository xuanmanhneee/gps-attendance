import IUnitRepository from '../../unit.repository';
import { Unit } from '../../unit.model';
import { mockUnits } from '#common/mock-data/units.mock';

export class InMemoryUnitRepository implements IUnitRepository {
  private units: Unit[] = mockUnits.map((unit) => ({
    ...unit,
    children: [],
  }));

  private nextId = Math.max(...this.units.map((unit) => unit.id)) + 1;

  findById(id: number): Promise<Unit | null> {
    const unit = this.units.find((unit) => unit.id === id);

    return Promise.resolve(unit ? this.clone(unit) : null);
  }

  findByIds(ids: number[]): Promise<Unit[]> {
    const units = this.units.filter((unit) => ids.includes(unit.id));

    return Promise.resolve(units.map((unit) => this.clone(unit)));
  }

  findAll(): Promise<Unit[]> {
    return Promise.resolve(this.units.map((unit) => this.clone(unit)));
  }

  create(data: {
    name: string;
    parentId: number | null;
    level: number;
  }): Promise<Unit> {
    const unit: Unit = {
      id: this.nextId++,
      name: data.name,
      parentId: data.parentId,
      level: data.level,
    };

    this.units.push(unit);

    return Promise.resolve(this.clone(unit));
  }

  update(
    id: number,
    data: {
      name?: string;
      parentId?: number | null;
      level?: number;
    },
  ): Promise<Unit> {
    const index = this.units.findIndex((unit) => unit.id === id);

    if (index === -1) {
      return Promise.reject(new Error('Unit not found'));
    }

    const current = this.units[index];

    const updated: Unit = {
      ...current,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.parentId !== undefined && {
        parentId: data.parentId,
      }),
      ...(data.level !== undefined && {
        level: data.level,
      })
    };

    this.units[index] = updated;

    return Promise.resolve(this.clone(updated));
  }

  delete(id: number): Promise<void> {
    const index = this.units.findIndex((unit) => unit.id === id);

    if (index === -1) {
      return Promise.reject(new Error('Unit not found'));
    }

    this.units.splice(index, 1);

    return Promise.resolve();
  }

  private clone(unit: Unit): Unit {
    return {
      ...unit
    };
  }
}