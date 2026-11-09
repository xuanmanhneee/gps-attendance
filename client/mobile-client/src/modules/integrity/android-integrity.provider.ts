import * as AppIntegrity from '@expo/app-integrity';

import type { IntegrityProvider } from './integrity-provider';

const PROVIDER_INVALID = 'ERR_APP_INTEGRITY_PROVIDER_INVALID';

const errorCodeOf = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;

export class AndroidIntegrityProvider implements IntegrityProvider {
  private preparation: Promise<void> | null = null;

  constructor(private readonly cloudProjectNumber: string | undefined) {}

  async getToken(requestHash: string): Promise<string | null> {
    if (!this.cloudProjectNumber) return null;

    await this.prepare();
    try {
      return await AppIntegrity.requestIntegrityCheckAsync(requestHash);
    } catch (error) {
      if (errorCodeOf(error) !== PROVIDER_INVALID) throw error;

      this.preparation = null;
      await this.prepare();
      return AppIntegrity.requestIntegrityCheckAsync(requestHash);
    }
  }

  private prepare(): Promise<void> {
    return (this.preparation ??=
      AppIntegrity.prepareIntegrityTokenProviderAsync(
        this.cloudProjectNumber!,
      ).catch((error) => {
        this.preparation = null;
        throw error;
      }));
  }
}
