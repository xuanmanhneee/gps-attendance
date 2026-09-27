import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'installationDeviceId';

async function readStoredId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(DEVICE_ID_KEY);
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

async function writeStoredId(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(DEVICE_ID_KEY, value);
    } catch {
      // ignore quota / private mode
    }
    return;
  }

  await SecureStore.setItemAsync(DEVICE_ID_KEY, value);
}

export async function getStableDeviceId(): Promise<string> {
  const stored = await readStoredId();
  if (stored) {
    return stored;
  }

  const generated =
    Device.osBuildId ??
    Device.modelId ??
    `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  await writeStoredId(generated);
  return generated;
}
