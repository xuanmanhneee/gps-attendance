import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

import type {
  IIntegrityVerifier,
  IntegrityVerificationInput,
} from './integrity-verifier';

const MAX_TOKEN_AGE_MS = 2 * 60_000;
const MAX_FUTURE_SKEW_MS = 30_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const statusOf = (error: unknown): number | undefined => {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  return typeof error.response.status === 'number'
    ? error.response.status
    : undefined;
};

export function isTrustedPlayIntegrityVerdict(
  value: unknown,
  expectedPackageName: string,
  expectedRequestHash: string,
  nowMs = Date.now(),
): boolean {
  if (!isRecord(value) || !isRecord(value.tokenPayloadExternal)) return false;

  const payload = value.tokenPayloadExternal;
  const request = payload.requestDetails;
  const app = payload.appIntegrity;
  const device = payload.deviceIntegrity;
  if (!isRecord(request) || !isRecord(app) || !isRecord(device)) return false;

  const timestampMs = Number(request.timestampMillis);
  const deviceVerdicts = device.deviceRecognitionVerdict;

  return (
    request.requestPackageName === expectedPackageName &&
    request.requestHash === expectedRequestHash &&
    Number.isFinite(timestampMs) &&
    timestampMs >= nowMs - MAX_TOKEN_AGE_MS &&
    timestampMs <= nowMs + MAX_FUTURE_SKEW_MS &&
    app.appRecognitionVerdict === 'PLAY_RECOGNIZED' &&
    app.packageName === expectedPackageName &&
    Array.isArray(deviceVerdicts) &&
    deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY')
  );
}

@Injectable()
export class PlayIntegrityVerifier implements IIntegrityVerifier {
  private readonly auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/playintegrity'],
  });

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>('PLAY_INTEGRITY_PACKAGE_NAME'));
  }

  async verify(input: IntegrityVerificationInput): Promise<boolean> {
    const packageName = this.config.getOrThrow<string>(
      'PLAY_INTEGRITY_PACKAGE_NAME',
    );

    try {
      const response = await this.auth.request<unknown>({
        url: `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`,
        method: 'POST',
        data: { integrity_token: input.token },
        timeout: 10_000,
      });

      return isTrustedPlayIntegrityVerdict(
        response.data,
        packageName,
        input.expectedRequestHash,
      );
    } catch (error) {
      if (statusOf(error) === 400) return false;
      throw new ServiceUnavailableException(
        'Không thể xác minh tính toàn vẹn thiết bị lúc này',
      );
    }
  }
}
