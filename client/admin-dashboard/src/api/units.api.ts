import type {
  ApiErrorCode,
  CreateUnitRequest,
  UnitResponse,
  UnitTreeResponse,
  UpdateUnitRequest,
} from '@gps-attendance/shared';
import { ApiError } from '@gps-attendance/shared';

import { httpClient } from './http';

const assertValidId = (id: number) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid unit id: ${String(id)}`);
  }
};

type ApiSuccessPayload<T> = { success: true; data: T };
type ApiErrorPayload = { success: false; code: ApiErrorCode; message: string };

/**
 * `FetchHttpClient` trong shared package hiện chỉ expose get/post/put/delete
 * trong khi backend Units dùng `PATCH /units/:id`. Handoff cấm sửa `server`
 * nên PATCH được thực hiện cục bộ tại đây bằng `fetch`, tái sử dụng cùng
 * base URL, token provider và shape `{ success, data }` của `httpClient`.
 */
const patchUnit = async (
  id: number,
  request: UpdateUnitRequest,
): Promise<UnitResponse> => {
  assertValidId(id);

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const token = localStorage.getItem('token');
  const response = await fetch(`${baseUrl}/units/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  const result = (await response.json().catch(() => null)) as
    | ApiSuccessPayload<UnitResponse>
    | ApiErrorPayload
    | null;

  if (!response.ok || !result || result.success !== true) {
    if (result && result.success === false) {
      const payload = result as ApiErrorPayload;
      throw new ApiError(payload.code, payload.message, response.status);
    }

    throw new Error(`API request failed: ${response.status}`);
  }

  return result.data;
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
  getAll() {
    return httpClient.get<UnitResponse[]>('/units');
  },

  getTree() {
    return httpClient.get<UnitTreeResponse[]>('/units/tree');
  },

  async getById(id: number): Promise<UnitResponse | null> {
    assertValidId(id);

    const data = await httpClient.get<UnitResponse | null>(`/units/${id}`);

    return data ?? null;
  },

  create(request: CreateUnitRequest) {
    return httpClient.post<UnitResponse>('/units', request);
  },

  update(id: number, request: UpdateUnitRequest) {
    return patchUnit(id, request);
  },
};
