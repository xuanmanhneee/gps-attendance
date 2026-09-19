import { createContext } from 'react';

import type { ResolvedTheme, ThemeMode } from '../types/theme';

export interface ThemeContextValue {
  /** Lựa chọn của người dùng: light, dark hoặc theo hệ thống. */
  mode: ThemeMode;
  /** Theme thực tế đang áp dụng sau khi resolve `system`. */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Chuyển vòng light -> dark -> system. */
  cycleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);