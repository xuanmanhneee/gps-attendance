import { getToken } from '@/services/token-storage';
import { createHttpClient } from '@gps-attendance/shared';

export const httpClient = createHttpClient(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  () => getToken()
);