// unit.repository.ts
import { Unit } from './unit.model';
import { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';

interface IUnitRepository {
  findById(id: number, ctx?: ITransactionContext): Promise<Unit | null>;
  findByIds(ids: number[], ctx?: ITransactionContext): Promise<Unit[]>;
  findAll(ctx?: ITransactionContext): Promise<Unit[]>;

  create(
    data: {
      name: string;
      parentId: number | null;
      level: number;
    },
    ctx?: ITransactionContext,
  ): Promise<Unit>;

  update(
    id: number,
    data: {
      name?: string;
      parentId?: number | null;
      level?: number;
    },
    ctx?: ITransactionContext,
  ): Promise<Unit>;

  delete(id: number, ctx?: ITransactionContext): Promise<void>;
}

export default IUnitRepository;
