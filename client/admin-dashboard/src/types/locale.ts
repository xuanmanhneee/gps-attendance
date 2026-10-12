export type SupportedLocale = 'vi' | 'en';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['vi', 'en'];

export const DEFAULT_LOCALE: SupportedLocale = 'vi';

export const isSupportedLocale = (value: unknown): value is SupportedLocale =>
  typeof value === 'string' &&
  (SUPPORTED_LOCALES as readonly string[]).includes(value);
