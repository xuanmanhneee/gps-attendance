import type { UserFilterCriteria } from './user-filter.types'; // chỉnh path đúng theo nơi khai báo type

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isIdList = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((x) => Number.isInteger(x) && x > 0);

const isCodeList = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.every((x) => typeof x === 'string' && x.trim().length > 0);

const size = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

/**
 * Kiểm tra input có đúng cấu trúc UserFilterCriteria không.
 * Không chuẩn hóa dữ liệu: client phải gửi đúng dạng (unit/tag luôn có đủ
 * include + exclude; code có thể thiếu).
 */
export function isValidUserFilterCriteria(
  input: unknown,
): input is UserFilterCriteria {
  if (!isObject(input)) return false;

  const { unitFilter, tagFilter, codeFilter } = input;
  let hasCondition = false;

  for (const step of [unitFilter, tagFilter]) {
    if (step === undefined) continue;
    if (!isObject(step) || !isIdList(step.include) || !isIdList(step.exclude)) {
      return false;
    }
    if (size(step.include) + size(step.exclude) > 0) hasCondition = true;
  }

  if (codeFilter !== undefined) {
    if (!isObject(codeFilter)) return false;

    for (const list of [codeFilter.include, codeFilter.exclude]) {
      if (list !== undefined && !isCodeList(list)) return false;
    }
    if (size(codeFilter.include) + size(codeFilter.exclude) > 0) {
      hasCondition = true;
    }
  }

  return hasCondition;
}