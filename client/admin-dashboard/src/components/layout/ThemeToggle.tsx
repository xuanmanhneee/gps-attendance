import type { IconType } from 'react-icons';
import { MdBrightnessAuto, MdDarkMode, MdLightMode } from 'react-icons/md';

import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translation-keys';
import type { ThemeMode } from '../../types/theme';
import { IconButton } from '../ui/IconButton';

const THEME_ICONS: Record<ThemeMode, IconType> = {
  light: MdLightMode,
  dark: MdDarkMode,
  system: MdBrightnessAuto,
};

const THEME_LABEL_KEYS: Record<ThemeMode, TranslationKey> = {
  light: 'common.theme.light',
  dark: 'common.theme.dark',
  system: 'common.theme.system',
};

export const ThemeToggle = () => {
  const { t } = useTranslation();
  const { mode, cycleMode } = useTheme();

  return (
    <IconButton
      icon={THEME_ICONS[mode]}
      onClick={cycleMode}
      label={t('common.themeToggleAria')}
      title={t(THEME_LABEL_KEYS[mode])}
    />
  );
};