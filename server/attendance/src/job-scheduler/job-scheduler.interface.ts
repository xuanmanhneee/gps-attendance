export interface IJobScheduler {
  onJob<T>(type: string, handler: (payload: T) => Promise<void>): void;
  schedule<T>(
    type: string,
    runAt: Date,
    payload: T,
    id?: string,
  ): Promise<void>;
  cancel(id: string): Promise<void>;
}
