export const deviceTrustCacheKey = (userId: number, deviceId: string) =>
  `attendance:device-trust:${userId}:${deviceId}`;
