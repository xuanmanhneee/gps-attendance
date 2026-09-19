import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { dictionaries } from '../i18n';
import { interpolate } from '../i18n/translation-keys';
import type {
  TranslationKey,
  TranslationParams,
  Translator,
} from '../i18n/translation-keys';
import { preferenceService } from '../services/preference.service';
import { LocaleContext } from './locale-context-value';
import type { LocaleContextValue } from './locale-context-value';

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  // Đọc lựa chọn đã lưu ngay ở lần render đầu để không nhấp nháy ngôn ngữ.
  const [locale, setLocaleState] = useState<LocaleContextValue['locale']>(() =>
    preferenceService.getLocale(),
  );

  const setLocale = useCallback((next: LocaleContextValue['locale']) => {
    preferenceService.setLocale(next);
    setLocaleState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo<Translator>(() => {
    const dictionary = dictionaries[locale];

    return (key: TranslationKey, params?: TranslationParams) =>
      interpolate(dictionary[key], params);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};
