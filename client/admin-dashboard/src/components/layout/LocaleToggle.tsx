import { MdTranslate } from 'react-icons/md';

import { useLocale } from '../../hooks/useLocale';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translation-keys';
import type { SupportedLocale } from '../../types/locale';
import { IconButton } from '../ui/IconButton';

const LOCALE_LABEL_KEYS: Record<SupportedLocale, TranslationKey> = {
  vi: 'common.locale.vi',
  en: 'common.locale.en',
};

export const LocaleToggle = () => {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  const nextLocale: SupportedLocale = locale === 'vi' ? 'en' : 'vi';

  return (
    <IconButton
      icon={MdTranslate}
      onClick={() => setLocale(nextLocale)}
      label={t('common.localeToggleAria')}
      title={t(LOCALE_LABEL_KEYS[nextLocale])}
    />
  );
};