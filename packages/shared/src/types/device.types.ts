// -----------------------------------------------------------------------------
// Device Identity
// -----------------------------------------------------------------------------

export interface DeviceIdentityPayload {
  /** ID logic của app installation/device */
  deviceId: string;

  /** Nền tảng */
  platform: DevicePlatform;
}

export type DevicePlatform = 'android' | 'ios';

// -----------------------------------------------------------------------------
// Device Credential
// -----------------------------------------------------------------------------

export type DeviceCredentialScheme = 'ec256' | 'rsa2048' | 'ed25519';

export interface DeviceCredentialRegistrationPayload {
  /** Thuật toán của key pair */
  scheme: DeviceCredentialScheme;

  /** Public key được tạo trên device */
  publicKey: string;
}

// -----------------------------------------------------------------------------
// Device Registration
// -----------------------------------------------------------------------------

export interface DeviceRegistrationPayload {
  /** Identity của device */
  identity: DeviceIdentityPayload;

  /** Credential dùng để đăng ký public key */
  credential: DeviceCredentialRegistrationPayload;

  /** Bằng chứng integrity từ platform */
  attestation: DeviceAttestationPayload;
}

// -----------------------------------------------------------------------------
// Device Challenge
// -----------------------------------------------------------------------------

export interface DeviceChallengeResponse {
  /** Challenge ngẫu nhiên do server tạo */
  challenge: string;

  /** Thời điểm challenge hết hạn, epoch milliseconds */
  expiresAt: number;
}

// -----------------------------------------------------------------------------
// Device Proof
// -----------------------------------------------------------------------------

export interface DeviceProofPayload {
  /** Phải khớp với credential đã đăng ký */
  scheme: DeviceCredentialScheme;

  /** Chữ ký được tạo bằng private key */
  proof: string;
}

// -----------------------------------------------------------------------------
// Device Attestation
// -----------------------------------------------------------------------------

export type DeviceAttestationPayload =
  | {
      platform: 'android';
      /** Play Integrity token */
      token: string | null;
    }
  | {
      platform: 'ios';
      /** App Attest data/token */
      token: string | null;
    };

// -----------------------------------------------------------------------------
// Device Verification
// -----------------------------------------------------------------------------

export interface DeviceVerificationPayload {
  /** Device đang yêu cầu xác minh */
  identity: DeviceIdentityPayload;

  /** Chữ ký của challenge */
  proof: DeviceProofPayload;

  /** Bằng chứng integrity của platform */
  attestation: DeviceAttestationPayload;
}
