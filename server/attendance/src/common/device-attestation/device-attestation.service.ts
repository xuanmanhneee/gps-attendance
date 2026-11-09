import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

const LOAD_TEST_TOKEN = 'gps-attendance-loadtest-attestation';
const MAX_TOKEN_AGE_MS = 120_000;
const MAX_FUTURE_SKEW_MS = 30_000;

type ServiceAccountCredentials = {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

@Injectable()
export class DeviceAttestationService {
  async verify(
    platform: string,
    integrityToken?: string | null,
  ): Promise<{ isValid: boolean; verdict: string; reasons: string[] }> {
    if (!integrityToken?.trim()) {
      return this.invalid('TOKEN_MISSING');
    }

    if (this.isLoadTestToken(integrityToken)) {
      return {
        isValid: true,
        verdict: 'LOAD_TEST_VERIFIED',
        reasons: [],
      };
    }

    if (platform !== 'android') {
      return this.invalid('PLATFORM_NOT_SUPPORTED');
    }

    const packageName = process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME;
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!packageName || !credentialsJson) {
      return this.invalid(
        'PROVIDER_NOT_CONFIGURED',
        'PLATFORM_ATTESTATION_VERIFICATION_NOT_CONFIGURED',
      );
    }

    const credentials = this.parseCredentials(credentialsJson);
    if (!credentials) {
      return this.invalid('PROVIDER_CONFIGURATION_INVALID');
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/playintegrity'],
    });
    const playIntegrity = google.playintegrity({ version: 'v1', auth });
    const response = await playIntegrity.v1.decodeIntegrityToken({
      packageName,
      requestBody: { integrityToken },
    });
    const payload = response.data.tokenPayloadExternal;
    if (!payload) {
      return this.invalid('TOKEN_PAYLOAD_MISSING');
    }

    const requestDetails = payload.requestDetails;
    if (
      requestDetails?.requestPackageName !== packageName ||
      !this.isTimestampFresh(requestDetails?.timestampMillis)
    ) {
      return this.invalid('REQUEST_DETAILS_INVALID');
    }

    const appVerdict = payload.appIntegrity?.appRecognitionVerdict;
    if (appVerdict !== 'PLAY_RECOGNIZED') {
      return this.invalid('APP_NOT_RECOGNIZED');
    }

    const deviceVerdicts =
      payload.deviceIntegrity?.deviceRecognitionVerdict ?? [];
    if (!deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY')) {
      return this.invalid('DEVICE_INTEGRITY_NOT_MET');
    }

    if (payload.accountDetails?.appLicensingVerdict !== 'LICENSED') {
      return this.invalid('APP_NOT_LICENSED');
    }

    return {
      isValid: true,
      verdict: 'PLAY_INTEGRITY_VERIFIED',
      reasons: [],
    };
  }

  private invalid(verdict: string, reason = verdict): {
    isValid: false;
    verdict: string;
    reasons: string[];
  } {
    return { isValid: false, verdict, reasons: [reason] };
  }

  private isTimestampFresh(timestamp?: string | null): boolean {
    if (!timestamp || !/^\d+$/.test(timestamp)) return false;
    const age = Date.now() - Number(timestamp);
    return age >= -MAX_FUTURE_SKEW_MS && age <= MAX_TOKEN_AGE_MS;
  }

  private parseCredentials(
    value: string,
  ): ServiceAccountCredentials | undefined {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return undefined;
    }
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const credentials = parsed as ServiceAccountCredentials;
    if (
      credentials.type !== 'service_account' ||
      !credentials.project_id ||
      !credentials.client_email ||
      !credentials.private_key
    ) {
      return undefined;
    }
    return credentials;
  }

  private isLoadTestToken(token: string): boolean {
    if (
      token !== LOAD_TEST_TOKEN ||
      process.env.NODE_ENV !== 'test' ||
      process.env.LOAD_TEST_MODE !== 'true'
    ) {
      return false;
    }

    try {
      const databaseName = new URL(process.env.DATABASE_URL ?? '').pathname
        .replace(/^\//, '')
        .split('?')[0];
      return databaseName === 'gps_attendance_loadtest';
    } catch {
      return false;
    }
  }
}
