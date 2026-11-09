import { isTrustedPlayIntegrityVerdict } from '../../../src/attendance-validation/integrity/play-integrity.verifier';

const now = 1_700_000_000_000;

const verdict = {
  tokenPayloadExternal: {
    requestDetails: {
      requestPackageName: 'com.gpsattendance.mobile',
      requestHash: 'request-hash',
      timestampMillis: String(now - 1_000),
    },
    appIntegrity: {
      appRecognitionVerdict: 'PLAY_RECOGNIZED',
      packageName: 'com.gpsattendance.mobile',
    },
    deviceIntegrity: {
      deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'],
    },
  },
};

describe('isTrustedPlayIntegrityVerdict', () => {
  it('accepts a fresh verdict bound to the expected app and request', () => {
    expect(
      isTrustedPlayIntegrityVerdict(
        verdict,
        'com.gpsattendance.mobile',
        'request-hash',
        now,
      ),
    ).toBe(true);
  });

  it.each([
    ['another request', { requestHash: 'other' }],
    ['a stale token', { timestampMillis: String(now - 120_001) }],
  ])('rejects %s', (_, requestDetails) => {
    expect(
      isTrustedPlayIntegrityVerdict(
        {
          tokenPayloadExternal: {
            ...verdict.tokenPayloadExternal,
            requestDetails: {
              ...verdict.tokenPayloadExternal.requestDetails,
              ...requestDetails,
            },
          },
        },
        'com.gpsattendance.mobile',
        'request-hash',
        now,
      ),
    ).toBe(false);
  });
});
