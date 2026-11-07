import { Platform, useColorScheme } from 'react-native';

/**
 * Dark mode color scheme (default)
 */
export const COLORS = {
  // Primary
  primary: '#006837',
  primaryLight: '#E8F5E9',
  primaryDark: '#004D25',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Neutral
  background: '#0F172A',
  card: '#1E293B',
  border: '#334155',

  // Text
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
  },
};

/**
 * Light mode color scheme
 */
export const COLORS_LIGHT = {
  // Primary
  primary: '#006837',
  primaryLight: '#E8F5E9',
  primaryDark: '#004D25',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Neutral
  background: '#FFFFFF',
  card: '#F8FAFC',
  border: '#E2E8F0',

  // Text
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
  },
};

export const colors = {
  primary: COLORS.primary,
  primaryLight: COLORS.primaryLight,
  primaryDark: COLORS.primaryDark,
  success: COLORS.success,
  successLight: '#064E3B',
  warning: COLORS.warning,
  warningLight: '#78350F',
  danger: COLORS.error,
  background: COLORS.background,
  surface: COLORS.card,
  border: COLORS.border,
  text: COLORS.text.primary,
  textSecondary: COLORS.text.secondary,
  textMuted: COLORS.text.secondary,
  disabled: '#475569',
};

export const Colors = {
  light: {
    text: COLORS_LIGHT.text.primary,
    background: COLORS_LIGHT.background,
    backgroundElement: COLORS_LIGHT.card,
    backgroundSelected: COLORS_LIGHT.primaryLight,
    textSecondary: COLORS_LIGHT.text.secondary,
  },
  dark: {
    text: COLORS.text.primary,
    background: COLORS.background,
    backgroundElement: COLORS.card,
    backgroundSelected: COLORS.border,
    textSecondary: COLORS.text.secondary,
  },
};

/**
 * Hook to get current theme colors
 */
export const useTheme = () => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? COLORS : COLORS_LIGHT;
};

/**
 * Spacing constants
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

/**
 * Border radius constants
 */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/**
 * Typography constants
 */
export const Typography = {
  fontSizes: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
  },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
