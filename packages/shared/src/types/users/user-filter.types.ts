export interface UnitFilterStep {
  /** Chọn Unit và tự kéo theo toàn bộ Unit con. */
  include: number[];

  /** Loại bỏ Unit con và toàn bộ subtree của chúng. */
  exclude: number[];
}

export interface TagFilterStep {
  /** Cộng thêm user có các tag này vào tập kết quả. */
  include: number[];

  /** Loại bỏ user có các tag này khỏi tập kết quả. */
  exclude: number[];
}

export interface CodeFilterStep {
  /** Cộng thêm user có các code này vào tập kết quả. */
  include?: string[];

  /** Loại bỏ user có các code này khỏi tập kết quả. */
  exclude?: string[];
}

/**
 * Tiêu chí lọc user.
 *
 * Phải có ít nhất một trong:
 * - unitFilter
 * - tagFilter
 * - codeFilter
 *
 * Các filter có thể kết hợp với nhau.
 *
 * Include của các filter được UNION.
 * Exclude luôn được áp dụng sau cùng.
 */
export type UserFilterCriteria = {
  unitFilter?: UnitFilterStep;
  tagFilter?: TagFilterStep;
  codeFilter?: CodeFilterStep;
};
