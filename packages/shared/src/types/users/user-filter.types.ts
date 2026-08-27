// users/user-filter.types.ts

export interface UnitFilterStep {
  /** Unit được chọn, tự kéo theo toàn bộ unit con. */
  includedUnitIds: number[];

  /** Phải là unit con của một trong các includedUnitIds. */
  excludedUnitIds: number[];
}

export interface TagFilterStep {
  /** Union — cộng thêm user match vào tập kết quả, dedup tự nhiên. */
  tagIds: number[];
}

export interface CodeFilterStep {
  /** Cộng thêm user theo code. */
  addCodes?: string[];

  /** Loại bỏ user theo code. */
  excludeCodes?: string[];
}

type RequireAtLeastOne<T, K extends keyof T = keyof T> = Omit<T, K> &
  {
    [P in K]-?: Required<Pick<T, P>> & Partial<Omit<Pick<T, K>, P>>;
  }[K];

/**
 * Tiêu chí lọc user.
 *
 * Phải có ít nhất một trong:
 * - unitFilter
 * - tagFilter
 * - codeFilter
 *
 * Có thể kết hợp nhiều filter cùng lúc.
 */
export type UserFilterCriteria = RequireAtLeastOne<{
  unitFilter?: UnitFilterStep;
  tagFilter?: TagFilterStep;
  codeFilter?: CodeFilterStep;
}>;
