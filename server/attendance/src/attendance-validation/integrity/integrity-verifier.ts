export interface IntegrityVerificationInput {
  token: string;
  expectedRequestHash: string;
}

export interface IIntegrityVerifier {
  isEnabled(): boolean;
  verify(input: IntegrityVerificationInput): Promise<boolean>;
}
