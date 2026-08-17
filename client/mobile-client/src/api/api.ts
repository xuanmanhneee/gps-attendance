export const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  console.log('API URL:', `${BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const http = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: 'GET',
    });
  },

  post<T>(
    path: string,
    body: unknown,
  ): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(
    path: string,
    body: unknown,
  ): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: 'DELETE',
    });
  },
};