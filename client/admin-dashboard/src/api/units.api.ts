import type {
  CreateUnitRequest,
  UnitResponse,
  UnitTreeResponse,
  UpdateUnitRequest,
} from '@gps-attendance/shared';

import { httpClient } from './http';

const assertValidId = (id: number) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid unit id: ${String(id)}`);
  }
};

const assertValidName = (name: string) => {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error('Unit name is required');
  }

  // Backend validate name 1-150 ký tự; chặn sớm ở client để giảm request lỗi.
  if (trimmed.length > 150) {
    throw new Error('Unit name must be at most 150 characters');
  }

  return trimmed;
};

const assertValidParentId = (parentId: number | null | undefined) => {
  if (parentId === undefined || parentId === null) return;

  if (!Number.isInteger(parentId) || parentId <= 0) {
    throw new Error(`Invalid parent id: ${String(parentId)}`);
  }
};

const patchUnit = async (
  id: number,
  request: UpdateUnitRequest,
): Promise<UnitResponse> => {
  assertValidId(id);

  return httpClient.patch<UnitResponse>(`/units/${id}`, request);
};

/**
 * Client cho domain Units.
 *
 * Backend controller là `@Controller('units')` (không có prefix `/v0`),
 * response thô được `ResponseInterceptor` bọc thành `{ success: true, data }`
 * và `httpClient` đã tự unwrap `data`, nên client chỉ làm việc với type
 * `UnitResponse`/`UnitTreeResponse` từ `@gps-attendance/shared`.
 */
export const unitsApi = {
  getAll(fresh = false) {
    return (fresh ? httpClient.getFresh : httpClient.get)<UnitResponse[]>(
      '/units',
    );
  },

  getTree(fresh = false) {
    return (fresh ? httpClient.getFresh : httpClient.get)<UnitTreeResponse[]>(
      '/units/tree',
    );
  },

  async getById(id: number): Promise<UnitResponse | null> {
    assertValidId(id);

    const data = await httpClient.get<UnitResponse | null>(`/units/${id}`);

    return data ?? null;
  },

  create(request: CreateUnitRequest) {
    const name = assertValidName(request.name);
    assertValidParentId(request.parentId);

    return httpClient.post<UnitResponse>('/units', {
      name,
      ...(request.parentId !== undefined && { parentId: request.parentId }),
    });
  },

  update(id: number, request: UpdateUnitRequest) {
    if (request.name !== undefined) {
      return patchUnit(id, {
        ...request,
        name: assertValidName(request.name),
      });
    }

    if (request.parentId !== undefined) {
      assertValidParentId(request.parentId);
    }

    return patchUnit(id, request);
  },
};
