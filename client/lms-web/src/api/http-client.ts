const TOKEN_KEY = 'lms-token';

type ApiErrorBody = { success?: false; code?: string; message?: string };

export class ApiError extends Error {
  constructor(message: string, readonly code = 'LMS_REQUEST_FAILED', readonly status = 0) {
    super(message);
  }
}

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = (await response.json()) as T | ApiErrorBody | { success: true; data: T };
  if (!response.ok) {
    const error = body as ApiErrorBody;
    throw new ApiError(error.message ?? 'Yêu cầu thất bại', error.code, response.status);
  }
  if (typeof body === 'object' && body !== null && 'success' in body) {
    if (!body.success) throw new ApiError(body.message ?? 'Yêu cầu thất bại', body.code, response.status);
    return body.data;
  }
  return body as T;
}
