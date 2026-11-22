import type {
  CheckInIntegrityInput,
  DeviceIntegrity,
} from '@gps-attendance/shared';
import { serializeCheckInIntegrityInput } from '@gps-attendance/shared';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { IntegrityProvider } from './integrity-provider';
import { unsupportedIntegrityProvider } from './unsupported-integrity.provider';

let provider: Promise<IntegrityProvider> | null = null;

function getProvider(): Promise<IntegrityProvider> {
  if (
    Platform.OS !== 'android' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    // shortcut: Expo Go sends no integrity token, use a development build to test native attestation.
    return Promise.resolve(unsupportedIntegrityProvider);
  }

  return (provider ??= import('./android-integrity.provider').then(
    ({ AndroidIntegrityProvider }) =>
      new AndroidIntegrityProvider(
        process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER,
      ),
  ));
}

export async function getIntegrity(
  input: CheckInIntegrityInput,
): Promise<DeviceIntegrity> {
  const requestHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    serializeCheckInIntegrityInput(input),
  );

  return { integrityToken: await (await getProvider()).getToken(requestHash) };
}

export type { IntegrityProvider } from './integrity-provider';
