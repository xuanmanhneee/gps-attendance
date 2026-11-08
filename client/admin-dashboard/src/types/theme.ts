export type ThemeMode = 'light' | 'dark' | 'system';

/** Theme đã được resolve từ `ThemeMode` + cấu hình hệ điều hành. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

export const DEFAULT_THEME_MODE: ThemeMode = 'light';

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);

export const toggleResolvedTheme = (
  theme: ResolvedTheme,
): ResolvedTheme => (theme === 'dark' ? 'light' : 'dark');
