import { createHttpClient } from '@gps-attendance/shared';

export const httpClient = createHttpClient(
  import.meta.env.VITE_API_BASE_URL,
  () => localStorage.getItem('token'),
);
