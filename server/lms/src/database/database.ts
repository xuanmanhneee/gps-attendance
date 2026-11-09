import { SqliteLmsRepository } from "./sqlite-lms.repository.ts";

export interface DatabaseModule {
  repository: SqliteLmsRepository;
  close(): void;
}
export function createDatabase(path: string): DatabaseModule {
  const repository = new SqliteLmsRepository(path);
  repository.seed();
  return { repository, close: () => repository.close() };
}
