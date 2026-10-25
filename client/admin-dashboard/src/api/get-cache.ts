type Entry = {
  promise?: Promise<unknown>;
  value?: unknown;
  expiresAt?: number;
};

/** Cache GET trong bộ nhớ của tab, gồm cả request đang chạy. */
export const createGetCache = () => {
  const entries = new Map<string, Entry>();
  let scope: string | null = null;
  let generation = 0;

  const clear = () => {
    generation += 1;
    entries.clear();
  };

  const setScope = (nextScope: string | null) => {
    if (scope === nextScope) return;
    scope = nextScope;
    clear();
  };

  const get = <T>(
    key: string,
    load: () => Promise<T>,
    ttlMs: number,
    fresh = false,
  ): Promise<T> => {
    if (fresh) entries.delete(key);

    const existing = entries.get(key);
    if (existing?.promise) return existing.promise as Promise<T>;
    if (existing && existing.expiresAt && existing.expiresAt > Date.now()) {
      return Promise.resolve(existing.value as T);
    }

    const requestGeneration = generation;
    const promise = load().then(
      (value) => {
        // Request cũ không được tái tạo cache sau logout hoặc mutation.
        if (
          generation === requestGeneration &&
          entries.get(key)?.promise === promise
        ) {
          entries.set(key, { value, expiresAt: Date.now() + ttlMs });
        }
        return value;
      },
      (error: unknown) => {
        if (entries.get(key)?.promise === promise) entries.delete(key);
        throw error;
      },
    );

    entries.set(key, { promise });
    return promise;
  };

  return { get, clear, setScope };
};
