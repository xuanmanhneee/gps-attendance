import * as ExpoLocation from 'expo-location';
import type { Location } from '@gps-attendance/shared';

export class LocationPermissionError extends Error {
  constructor() {
    super('Chưa cấp quyền vị trí');
    this.name = 'LocationPermissionError';
  }
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
    // accuracy có thể null; type của bạn là number nên đặt số lớn để server
    // đánh giá là độ tin cậy thấp thay vì coi như chính xác tuyệt đối
    accuracy: loc.coords.accuracy ?? 9999,
    timestamp: loc.timestamp, // epoch ms, đúng như type
    isMockLocation: loc.mocked ?? false, // iOS không có cờ này, luôn false
  };
}