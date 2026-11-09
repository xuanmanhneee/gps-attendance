export interface IntegrationSessionLink {
  id: number;
  externalId: string;
  requestFingerprint: string;
  attendanceSessionId: number | null;
  createdAt: Date;
}

export interface CreateIntegrationSessionLinkInput {
  externalId: string;
  requestFingerprint: string;
}
