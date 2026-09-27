import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'large',
  style,
  loading = false,
  icon,
}: ButtonProps) => {
  const containerStyle = [
    styles.container,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    loading && styles.disabled,
    Platform.OS === 'web' && (disabled || loading ? styles.webDisabled : styles.webEnabled),
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    disabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <>{icon}{<Text style={textStyle}>{title}</Text>}</>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  danger: {
    backgroundColor: COLORS.error,
  },
  disabled: {
    opacity: 0.5,
  },
  webEnabled: {
    cursor: 'pointer',
  } as ViewStyle,
  webDisabled: {
    cursor: 'not-allowed',
  } as ViewStyle,
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  medium: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  large: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },
  disabledText: {
    color: COLORS.text.secondary,
  },
});
