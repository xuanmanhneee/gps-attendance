import type { SupportedLocale } from '../types/locale';
import type { TranslationKey } from './translation-keys';
import { en } from './translations/en';
import { vi } from './translations/vi';

export type Dictionary = Record<TranslationKey, string>;

/**
 * Bản đồ dictionary theo locale.
 *
 * `Record<SupportedLocale, Dictionary>` bắt buộc mọi locale khai báo trong
 * `SupportedLocale` phải có dictionary tương ứng.
 */
export const dictionaries: Record<SupportedLocale, Dictionary> = {
  vi,
  en,
};

/** BCP-47 tag dùng cho `Intl`/`toLocaleString`. */
export const LOCALE_TAGS: Record<SupportedLocale, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};
