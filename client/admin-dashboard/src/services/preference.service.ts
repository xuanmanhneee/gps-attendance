import { DEFAULT_LOCALE, isSupportedLocale } from '../types/locale';
import type { SupportedLocale } from '../types/locale';
import { DEFAULT_THEME_MODE, isThemeMode } from '../types/theme';
import type { ThemeMode } from '../types/theme';

const THEME_KEY = 'gps-attendance.theme';
const LOCALE_KEY = 'gps-attendance.locale';

/**
 * Lưu lựa chọn hiển thị (theme, locale) bằng storage key ổn định.
 *
 * Giá trị đọc từ storage là dữ liệu ngoài nên luôn được validate lại;
 * giá trị không hợp lệ sẽ rơi về mặc định.
 */
export const preferenceService = {
  getTheme(): ThemeMode {
    const stored = localStorage.getItem(THEME_KEY);

    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
  },

  setTheme(mode: ThemeMode): void {
    localStorage.setItem(THEME_KEY, mode);
  },

  getLocale(): SupportedLocale {
    const stored = localStorage.getItem(LOCALE_KEY);

    return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
  },

  setLocale(locale: SupportedLocale): void {
    localStorage.setItem(LOCALE_KEY, locale);
  },
};
