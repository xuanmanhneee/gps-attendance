import { vi } from './translations/vi';

/**
 * Danh sách translation key hợp lệ, suy ra từ dictionary nguồn `vi`.
 *
 * Nhờ vậy mọi lời gọi `t('...')` đều được kiểm tra ở compile time.
 */
export type TranslationKey = keyof typeof vi;

export type TranslationParams = Record<string, string | number>;

export type Translator = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

/**
 * Nội suy placeholder dạng `{name}` trong chuỗi đã dịch.
 *
 * Không dùng template literal của JS để tránh thực thi biểu thức từ chuỗi dịch.
 */
export const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];

    return value === undefined ? match : String(value);
  });
};