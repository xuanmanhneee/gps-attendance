<<<<<<< HEAD
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
=======
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getStored, setStored } from './storage';

const DEVICE_ID_KEY = 'app_device_id';

let cached: string | null = null;
let pending: Promise<string> | null = null;

async function readStored(): Promise<string | null> {
  try {
    return await getStored(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

async function writeStored(id: string) {
  try {
    await setStored(DEVICE_ID_KEY, id);
  } catch {}
}

async function generate(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const id = Application.getAndroidId();
      if (id) return `android-${id}`;
    } else if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      if (id) return `ios-${id}`;
    }
  } catch {}
  return Crypto.randomUUID();
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;

  pending = (async () => {
    let id = await readStored();
    if (!id) {
      id = await generate();
      await writeStored(id);
    }
    cached = id;
    return id;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export async function resetDeviceId(): Promise<string> {
  const id = `debug-${Crypto.randomUUID()}`;
  await writeStored(id);
  cached = id;
  return id;
}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
