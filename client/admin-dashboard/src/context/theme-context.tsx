import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { preferenceService } from '../services/preference.service';
import { THEME_MODES } from '../types/theme';
import type { ResolvedTheme } from '../types/theme';
import { ThemeContext } from './theme-context-value';
import type { ThemeContextValue } from './theme-context-value';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeContextValue['mode']>(() =>
    preferenceService.getTheme(),
  );
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    if (mode !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const resolvedTheme: ResolvedTheme =
    mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setMode = useCallback((next: ThemeContextValue['mode']) => {
    preferenceService.setTheme(next);
    setModeState(next);
  }, []);

  const cycleMode = useCallback(() => {
    const nextIndex = (THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length;
    setMode(THEME_MODES[nextIndex]);
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, cycleMode }),
    [mode, resolvedTheme, setMode, cycleMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};