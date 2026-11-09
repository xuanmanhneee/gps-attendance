import type { IntegrityProvider } from './integrity-provider';

export const unsupportedIntegrityProvider: IntegrityProvider = {
  getToken: async () => null,
};
