import * as ExpoLocation from 'expo-location';
import type { Location } from '@gps-attendance/shared';

export class LocationPermissionError extends Error {
  constructor() {
    super('Chưa cấp quyền vị trí');
    this.name = 'LocationPermissionError';
  }
}

export class LocationAccuracyError extends Error {
  constructor() {
    super('Độ chính xác GPS không đạt yêu cầu');
    this.name = 'LocationAccuracyError';
  }
}

export const MAX_ATTENDANCE_LOCATION_ACCURACY_METERS = 100;

export function sanitizeLocationAccuracy(accuracy: number | null): number {
  if (
    accuracy === null ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > MAX_ATTENDANCE_LOCATION_ACCURACY_METERS
  ) {
    throw new LocationAccuracyError();
  }

  return accuracy;
}

export async function getCurrentLocation(): Promise<Location> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new LocationPermissionError();

  const loc = await ExpoLocation.getCurrentPositionAsync({
    accuracy: ExpoLocation.Accuracy.High, // điểm danh nên lấy độ chính xác cao
  });

  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: sanitizeLocationAccuracy(loc.coords.accuracy),
    timestamp: loc.timestamp, // epoch ms, đúng như type
    isMockLocation: loc.mocked ?? false, // iOS không có cờ này, luôn false
  };
}