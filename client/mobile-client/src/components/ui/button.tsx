import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../../constants/theme';

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
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.container,
    styles[variant],
    styles[size],
    isDisabled && styles.disabled,
    Platform.OS === 'web' && (isDisabled ? styles.webDisabled : styles.webEnabled),
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    isDisabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
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
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  webEnabled: ({
    cursor: 'pointer',
  } as unknown) as ViewStyle,
  webDisabled: ({
    cursor: 'not-allowed',
  } as unknown) as ViewStyle,
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
    color: colors.textSecondary,
  },
});
