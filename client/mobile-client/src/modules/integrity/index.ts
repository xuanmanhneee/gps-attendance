import type {
  CheckInIntegrityInput,
  DeviceIntegrity,
} from '@gps-attendance/shared';
import { serializeCheckInIntegrityInput } from '@gps-attendance/shared';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { AndroidIntegrityProvider } from './android-integrity.provider';
import type { IntegrityProvider } from './integrity-provider';
import { unsupportedIntegrityProvider } from './unsupported-integrity.provider';

const provider: IntegrityProvider =
  Platform.OS === 'android'
    ? new AndroidIntegrityProvider(
        process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER,
      )
    : unsupportedIntegrityProvider;

export async function getIntegrity(
  input: CheckInIntegrityInput,
): Promise<DeviceIntegrity> {
  const requestHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    serializeCheckInIntegrityInput(input),
  );

  return { integrityToken: await provider.getToken(requestHash) };
}

export type { IntegrityProvider } from './integrity-provider';
