import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
<<<<<<< HEAD
  Platform,
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
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
<<<<<<< HEAD
=======
  const isDisabled = disabled || loading;

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  const containerStyle = [
    styles.container,
    styles[variant],
    styles[size],
<<<<<<< HEAD
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

=======
    isDisabled && styles.disabled,
    style,
  ];

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
<<<<<<< HEAD
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <>{icon}{<Text style={textStyle}>{title}</Text>}</>}
=======
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, styles[`text_${size}`]]}>{title}</Text>
        </>
      )}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
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
<<<<<<< HEAD
  primary: {
    backgroundColor: COLORS.primary,
  },
=======

  primary: {
    backgroundColor: COLORS.primary,
  },

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  secondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
<<<<<<< HEAD
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
=======

  danger: {
    backgroundColor: COLORS.error,
  },

  disabled: {
    backgroundColor: '#BFD2C7',
  },

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  medium: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  large: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
<<<<<<< HEAD
=======

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  text: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
<<<<<<< HEAD
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
=======

  text_small: {
    fontSize: 12,
  },

  text_medium: {
    fontSize: 14,
  },

  text_large: {
    fontSize: 16,
  },
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
});
