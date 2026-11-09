import { google } from 'googleapis';
import { DeviceAttestationService } from './device-attestation.service';

describe('DeviceAttestationService', () => {
  const service = new DeviceAttestationService();
  const originalPackageName = process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME;
  const originalCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLoadTestMode = process.env.LOAD_TEST_MODE;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const playIntegrity = jest.spyOn(google, 'playintegrity');

  beforeEach(() => {
    delete process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  });

  afterAll(() => {
    if (originalPackageName === undefined) {
      delete process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME;
    } else {
      process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME = originalPackageName;
    }
    if (originalCredentials === undefined) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = originalCredentials;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalLoadTestMode === undefined) {
      delete process.env.LOAD_TEST_MODE;
    } else {
      process.env.LOAD_TEST_MODE = originalLoadTestMode;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    playIntegrity.mockRestore();
  });

  it('does not trust client-asserted Android integrity without a configured provider', async () => {
    await expect(
      service.verify(
        'android',
        JSON.stringify({
          deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'],
          securityChecks: { offlineAttestation: true },
        }),
      ),
    ).resolves.toEqual({
      isValid: false,
      verdict: 'PROVIDER_NOT_CONFIGURED',
      reasons: ['PLATFORM_ATTESTATION_VERIFICATION_NOT_CONFIGURED'],
    });
  });

  it('does not trust a client-asserted iOS token', async () => {
    await expect(service.verify('ios', 'client-asserted-token')).resolves.toEqual({
      isValid: false,
      verdict: 'PLATFORM_NOT_SUPPORTED',
      reasons: ['PLATFORM_NOT_SUPPORTED'],
    });
  });

  it('accepts a fresh, recognized Play Integrity token from Google', async () => {
    process.env.GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME = 'com.example.attendance';
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      client_email: 'test@example.invalid',
      private_key: 'test-only-private-key',
    });
    const decodeIntegrityToken = jest.fn().mockResolvedValue({
      data: {
        tokenPayloadExternal: {
          requestDetails: {
            requestPackageName: 'com.example.attendance',
            timestampMillis: String(Date.now()),
          },
          appIntegrity: { appRecognitionVerdict: 'PLAY_RECOGNIZED' },
          deviceIntegrity: {
            deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'],
          },
          accountDetails: { appLicensingVerdict: 'LICENSED' },
        },
      },
    });
    playIntegrity.mockReturnValue({
      v1: { decodeIntegrityToken },
    } as never);

    await expect(service.verify('android', 'google-issued-token')).resolves.toEqual({
      isValid: true,
      verdict: 'PLAY_INTEGRITY_VERIFIED',
      reasons: [],
    });
    expect(decodeIntegrityToken).toHaveBeenCalledWith({
      packageName: 'com.example.attendance',
      requestBody: { integrityToken: 'google-issued-token' },
    });
  });

  it('accepts the fixed load-test token only for the isolated load-test database', async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOAD_TEST_MODE = 'true';
    process.env.DATABASE_URL =
      'postgresql://perf:perf@postgres:5432/gps_attendance_loadtest';

    await expect(
      service.verify('android', 'gps-attendance-loadtest-attestation'),
    ).resolves.toEqual({
      isValid: true,
      verdict: 'LOAD_TEST_VERIFIED',
      reasons: [],
    });

    process.env.DATABASE_URL =
      'postgresql://perf:perf@postgres:5432/not_the_loadtest_database';
    await expect(
      service.verify('android', 'gps-attendance-loadtest-attestation'),
    ).resolves.toMatchObject({ isValid: false });
    delete process.env.LOAD_TEST_MODE;
  });
});
