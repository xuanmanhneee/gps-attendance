export interface IntegrityProvider {
  getToken(requestHash: string): Promise<string | null>;
}
