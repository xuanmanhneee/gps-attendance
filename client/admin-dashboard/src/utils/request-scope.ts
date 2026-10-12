/**
 * Bộ đếm request dùng để chống race condition khi người dùng đổi tag/đóng panel
 * trong lúc request cũ đang chạy.
 *
 * Mỗi lần `begin(key)` tạo một token mới và token cũ trở thành stale; response
 * của request cũ chỉ được commit khi `isCurrent(token)` vẫn đúng.
 */
export type RequestScopeToken = {
  /** Khoá nghiệp vụ của request — với tag assignment là `tag.id`. */
  key: number | null;
  sequence: number;
};

export type RequestScope = {
  begin: (key: number | null) => RequestScopeToken;
  isCurrent: (token: RequestScopeToken) => boolean;
  invalidate: () => void;
  currentKey: () => number | null;
};

export const createRequestScope = (): RequestScope => {
  let sequence = 0;
  let active: RequestScopeToken | null = null;

  return {
    begin(key) {
      sequence += 1;
      active = { key, sequence };
      return active;
    },

    isCurrent(token) {
      return (
        active !== null &&
        active.sequence === token.sequence &&
        active.key === token.key
      );
    },

    invalidate() {
      active = null;
    },

    currentKey() {
      return active ? active.key : null;
    },
  };
};
