import type {
  CreateIntegrationSessionLinkInput,
  IntegrationSessionLink,
} from './integration-session-link.model';

export interface IIntegrationSessionLinkRepository {
  create(
    input: CreateIntegrationSessionLinkInput,
  ): Promise<IntegrationSessionLink>;
  findByExternalId(externalId: string): Promise<IntegrationSessionLink | null>;
  attachSession(
    linkId: number,
    sessionId: number,
  ): Promise<IntegrationSessionLink>;
  delete(id: number): Promise<void>;
}
