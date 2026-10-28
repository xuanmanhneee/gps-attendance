import { useCallback, useEffect, useState } from 'react';

import type {
  CreateUnitRequest,
  UnitResponse,
  UnitTreeResponse,
  UpdateUnitRequest,
} from '@gps-attendance/shared';

import { unitsApi } from '../api/units.api';

export type UseUnitsResult = {
  units: UnitResponse[];
  tree: UnitTreeResponse[];
  isLoading: boolean;
  isTreeLoading: boolean;
  error: Error | null;
  treeError: Error | null;
  reload: () => Promise<void>;
  reloadTree: () => Promise<void>;
  createUnit: (request: CreateUnitRequest) => Promise<UnitResponse>;
  updateUnit: (id: number, request: UpdateUnitRequest) => Promise<UnitResponse>;
};

const toError = (unknownError: unknown): Error =>
  unknownError instanceof Error
    ? unknownError
    : new Error('Unable to load units');

/**
 * Quản lý danh sách và cây unit từ backend.
 *
 * Loading của list và tree tách riêng để UI không hiển thị trạng thái thành
 * công giả khi một trong hai nguồn còn đang tải hoặc đã lỗi.
 */
export const useUnits = (): UseUnitsResult => {
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [tree, setTree] = useState<UnitTreeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [treeError, setTreeError] = useState<Error | null>(null);

  const reload = useCallback(async (fresh = true) => {
    setIsLoading(true);

    try {
      const data = await unitsApi.getAll(fresh);

      setUnits(Array.isArray(data) ? [...data] : []);
      setError(null);
    } catch (unknownError) {
      setUnits([]);
      setError(toError(unknownError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadTree = useCallback(async (fresh = true) => {
    setIsTreeLoading(true);

    try {
      const data = await unitsApi.getTree(fresh);

      setTree(Array.isArray(data) ? [...data] : []);
      setTreeError(null);
    } catch (unknownError) {
      setTree([]);
      setTreeError(toError(unknownError));
    } finally {
      setIsTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch khi mount; setState nằm sau `await` nên không gây cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadTree(false);
  }, [reload, reloadTree]);

  const createUnit = useCallback(
    async (request: CreateUnitRequest): Promise<UnitResponse> => {
      const created = await unitsApi.create({
        name: request.name.trim(),
        ...(request.parentId !== undefined && { parentId: request.parentId }),
      });

      if (!created || typeof created.id !== 'number') {
        throw new Error('Server không trả về dữ liệu unit hợp lệ sau khi tạo');
      }

      await Promise.all([reload(), reloadTree()]);

      return created;
    },
    [reload, reloadTree],
  );

  const updateUnit = useCallback(
    async (id: number, request: UpdateUnitRequest): Promise<UnitResponse> => {
      const updated = await unitsApi.update(id, {
        ...(request.name !== undefined && { name: request.name.trim() }),
        ...(request.parentId !== undefined && { parentId: request.parentId }),
      });

      if (!updated || typeof updated.id !== 'number') {
        throw new Error(
          'Server không trả về dữ liệu unit hợp lệ sau khi cập nhật',
        );
      }

      await Promise.all([reload(), reloadTree()]);

      return updated;
    },
    [reload, reloadTree],
  );

  return {
    units,
    tree,
    isLoading,
    isTreeLoading,
    error,
    treeError,
    reload,
    reloadTree,
    createUnit,
    updateUnit,
  };
};
