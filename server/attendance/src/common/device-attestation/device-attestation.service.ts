import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceAttestationService {
  verify(platform: string, integrityToken?: string | null): {
    isValid: boolean;
    verdict: string;
    reasons: string[];
  } {
    const normalizedPlatform = (platform ?? '').toLowerCase();

    if (!integrityToken || !integrityToken.trim()) {
      return {
        isValid: false,
        verdict: 'TOKEN_MISSING',
        reasons: ['PLATFORM_ATTESTATION_VALIDATOR_NOT_CONFIGURED'],
      };
    }

    try {
      const payload = this.decodePayload(integrityToken);
      if (!payload) {
        return {
          isValid: false,
          verdict: 'TOKEN_INVALID',
          reasons: ['ATTESTATION_FORMAT_INVALID'],
        };
      }

      if (normalizedPlatform === 'ios') {
        const appAttestResult =
          payload.appAttestStatus ??
          payload.app_attest_status ??
          payload.attestation?.status ??
          payload.status ??
          payload.verdict;
        const status = String(appAttestResult ?? '').toLowerCase();
        const isVerified =
          status === 'verified' ||
          status === 'valid' ||
          status === 'success' ||
          status === 'meets_attestation';

        return {
          isValid: isVerified,
          verdict: isVerified ? 'APP_ATTEST_VERIFIED' : 'APP_ATTEST_REJECTED',
          reasons: isVerified ? [] : ['APP_ATTESTATION_UNVERIFIED'],
        };
      }

      const verdictCandidates = [
        payload.deviceIntegrityVerdict,
        payload.device_integrity_verdict,
        payload.integrityVerdict,
        payload.integrity_verdict,
        payload.verdict,
      ];
      const verdictString = verdictCandidates
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value))
        .join(' ');
      const normalizedVerdict = verdictString.toLowerCase();
      const isStrong =
        normalizedVerdict.includes('meets_strong_integrity') ||
        normalizedVerdict.includes('meets_device_integrity') ||
        normalizedVerdict.includes('strong_integrity') ||
        normalizedVerdict.includes('device_integrity');

      return {
        isValid: isStrong,
        verdict: isStrong ? 'PLAY_INTEGRITY_VERIFIED' : 'PLAY_INTEGRITY_REJECTED',
        reasons: isStrong ? [] : ['PLAY_INTEGRITY_WEAK_OR_MISSING'],
      };
    } catch (error) {
      return {
        isValid: false,
        verdict: 'TOKEN_INVALID',
        reasons: ['ATTESTATION_FORMAT_INVALID'],
      };
    }
  }

  private decodePayload(token: string): Record<string, any> | null {
    const segments = token.split('.');
    if (segments.length < 2) {
      return null;
    }

    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.length % 4 === 0 ? base64 : base64 + '='.repeat(4 - (base64.length % 4));

    try {
      return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, any>;
    } catch {
      return null;
    }
  }
}
