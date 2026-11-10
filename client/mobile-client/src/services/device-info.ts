import * as ExpoDevice from 'expo-device';
import { Platform } from 'react-native';
import type { Device } from '@gps-attendance/attendance-client';
import { getDeviceId } from './device-id';

export async function buildDeviceInfo(): Promise<Device> {
  return {
    deviceId: await getDeviceId(),
    // Web chỉ dùng để dev/test nên ép kiểu; app chính thức chỉ có android/ios
    platform: Platform.OS as Device['platform'],
    model: ExpoDevice.modelName ?? 'unknown',
  };
}
