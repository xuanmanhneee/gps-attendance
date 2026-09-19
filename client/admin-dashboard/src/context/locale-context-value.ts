import { createContext } from 'react';

import type { Translator } from '../i18n/translation-keys';
import type { SupportedLocale } from '../types/locale';

export interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: Translator;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);